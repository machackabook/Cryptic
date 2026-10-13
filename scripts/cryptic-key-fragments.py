#!/usr/bin/env python3
"""Normalize SSH public-key fragments against the OpenSSH wire format and fingerprints.

This tool never reconstructs a private key or invents missing public-key bytes. It can join
wrapped public-key base64 fragments, validate the resulting SSH blob, or recover an exact
public key from an explicitly supplied known-good public-key inventory matching a fingerprint.
"""
from __future__ import annotations
import argparse, base64, hashlib, json, re, sys, unicodedata
from pathlib import Path

KEY_TYPES = {
    "ssh-ed25519", "ssh-rsa",
    "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521",
    "sk-ssh-ed25519@openssh.com", "sk-ecdsa-sha2-nistp256@openssh.com",
}
ZW_CHARS = "\u200b\u200c\u200d\u2060\ufeff"

class KeyErrorSafe(Exception): pass

def read_ssh_string(blob: bytes, pos: int) -> tuple[bytes, int]:
    if pos + 4 > len(blob): raise KeyErrorSafe("truncated SSH string length")
    n = int.from_bytes(blob[pos:pos+4], "big"); pos += 4
    if n > len(blob) - pos: raise KeyErrorSafe("truncated SSH string data")
    return blob[pos:pos+n], pos+n

def validate_blob(blob: bytes, declared_type: str | None = None) -> str:
    key_type_bytes, p = read_ssh_string(blob, 0)
    try: key_type = key_type_bytes.decode("ascii")
    except UnicodeDecodeError as exc: raise KeyErrorSafe("SSH key type is not ASCII") from exc
    if key_type not in KEY_TYPES: raise KeyErrorSafe("unsupported SSH public key type: " + key_type)
    if declared_type and declared_type != key_type: raise KeyErrorSafe("declared type does not match embedded key type")
    fields = []
    while p < len(blob):
        field, p = read_ssh_string(blob, p); fields.append(field)
    if key_type == "ssh-ed25519" and (len(fields) != 1 or len(fields[0]) != 32):
        raise KeyErrorSafe("Ed25519 public key must contain one 32-byte public key field")
    if key_type == "ssh-rsa" and (len(fields) != 2 or not all(fields)):
        raise KeyErrorSafe("RSA public key must contain exponent and modulus")
    if key_type.startswith("ecdsa-sha2-"):
        curve = key_type.removeprefix("ecdsa-sha2-")
        if len(fields) != 2 or fields[0].decode("ascii", "ignore") != curve or not fields[1]:
            raise KeyErrorSafe("ECDSA public key curve/point fields are malformed")
    if key_type == "sk-ssh-ed25519@openssh.com" and (len(fields) not in (2,3) or len(fields[0]) != 32):
        raise KeyErrorSafe("security-key Ed25519 fields are malformed")
    if key_type == "sk-ecdsa-sha2-nistp256@openssh.com" and (len(fields) not in (3,4) or fields[0].decode("ascii","ignore") != "nistp256"):
        raise KeyErrorSafe("security-key ECDSA fields are malformed")
    return key_type

def fingerprint(blob: bytes) -> str:
    return "SHA256:" + base64.b64encode(hashlib.sha256(blob).digest()).decode("ascii").rstrip("=")

def parse_public_line(line: str) -> dict | None:
    parts = line.strip().split()
    if len(parts) < 2 or parts[0] not in KEY_TYPES: return None
    try:
        blob = base64.b64decode(parts[1].encode("ascii"), validate=True)
        actual = validate_blob(blob, parts[0])
    except (ValueError, UnicodeEncodeError, KeyErrorSafe): return None
    return {"type":actual,"blob":blob,"b64":base64.b64encode(blob).decode("ascii"),
            "comment":" ".join(parts[2:])[:180],"fingerprint":fingerprint(blob)}

def inventory_keys(paths: list[str]) -> list[dict]:
    out=[]
    for item in paths:
        path=Path(item).expanduser()
        if not path.is_file(): raise KeyErrorSafe("known public-key file does not exist: " + str(path))
        for line in path.read_text(encoding="utf-8",errors="replace").splitlines():
            rec=parse_public_line(line)
            if rec: rec["source"]=str(path);out.append(rec)
    return out

def fragment_candidates(text: str, key_type: str | None) -> list[dict]:
    # Remove only known zero-width presentation marks. Never transliterate aliases into key bytes.
    normalized=unicodedata.normalize("NFC",text).translate({ord(ch):None for ch in ZW_CHARS})
    for line in normalized.splitlines():
        rec=parse_public_line(line)
        if rec: return [rec]
    types=[kind for kind in KEY_TYPES if re.search(r"(?<![A-Za-z0-9@-])"+re.escape(kind)+r"(?![A-Za-z0-9@-])",normalized)]
    if key_type: types=[key_type]
    for kind in types:
        after=normalized[normalized.find(kind)+len(kind):]
        assembled=""
        for part in after.split():
            if not re.fullmatch(r"[A-Za-z0-9+/]+={0,2}",part): break
            assembled+=part
            if len(assembled)%4==1: continue
            padded=assembled+"="*((-len(assembled))%4)
            try:
                blob=base64.b64decode(padded,validate=True)
                actual=validate_blob(blob,kind)
                return [{"type":actual,"blob":blob,"b64":base64.b64encode(blob).decode("ascii"),
                         "comment":"normalized-public-fragment","fingerprint":fingerprint(blob)}]
            except (ValueError,KeyErrorSafe): continue
    return []

def main() -> int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fragments",required=True,help="Text file with wrapped SSH public-key material")
    ap.add_argument("--known-public-key",action="append",default=[],help="Known-good .pub or authorized_keys file; repeatable")
    ap.add_argument("--expected-fingerprint",help="Require this exact OpenSSH SHA256 fingerprint")
    ap.add_argument("--key-type",choices=sorted(KEY_TYPES),help="Algorithm label if fragments omit it")
    ap.add_argument("--output",help="Write normalized public key to this path; refuses overwrite")
    args=ap.parse_args(); fragment_file=Path(args.fragments).expanduser()
    if not fragment_file.is_file():
        print(json.dumps({"ok":False,"status":"INPUT_NOT_FOUND","message":"fragment input file not found"},indent=2));return 2
    try:
        candidates=fragment_candidates(fragment_file.read_text(encoding="utf-8",errors="replace"),args.key_type)
        inventory=inventory_keys(args.known_public_key)
    except (OSError,KeyErrorSafe) as exc:
        print(json.dumps({"ok":False,"status":"INPUT_ERROR","message":str(exc)},indent=2));return 2
    expected=args.expected_fingerprint;chosen=None;source="fragments"
    for rec in candidates:
        if not expected or rec["fingerprint"]==expected: chosen=rec;break
    if chosen is None and expected:
        matches=[k for k in inventory if k["fingerprint"]==expected]
        if len(matches)==1: chosen=matches[0];source="known-good-inventory"
    if chosen is None:
        status="FINGERPRINT_MISMATCH" if expected and candidates else "UNRECOVERABLE_TRUNCATED_OR_MALFORMED"
        print(json.dumps({"ok":False,"status":status,"candidate_fingerprints":[k["fingerprint"] for k in candidates],
          "known_inventory_fingerprints":[k["fingerprint"] for k in inventory],
          "message":"No complete public key matching the requirements was found. Missing bytes cannot be inferred; supply intact fragments or an explicit known-good key inventory. Private keys are never reconstructed."},indent=2));return 2
    if args.output:
        output=Path(args.output).expanduser()
        if output.exists():
            print(json.dumps({"ok":False,"status":"REFUSED_OVERWRITE","message":"output file already exists"},indent=2));return 3
        output.parent.mkdir(parents=True,exist_ok=True)
        line=chosen["type"]+" "+chosen["b64"]+(" "+chosen.get("comment","") if chosen.get("comment") else "")+"\n"
        output.write_text(line,encoding="utf-8")
        try: output.chmod(0o644)
        except OSError: pass
    print(json.dumps({"ok":True,"status":"PUBLIC_KEY_VALIDATED","source":source,"type":chosen["type"],
      "fingerprint":chosen["fingerprint"],"output":str(Path(args.output).expanduser()) if args.output else None,
      "private_key_touched":False,"missing_bytes_invented":False,
      "message":"Public key validated against SSH wire format and fingerprint; a fresh signed challenge is still required to authenticate a device."},indent=2))
    return 0
if __name__=="__main__": raise SystemExit(main())
