#!/usr/bin/env python3
"""Normalize SSH *public* key fragments against the OpenSSH wire format and fingerprints.

This tool does not reconstruct missing key bytes and never reads or repairs private keys.
It can join wrapped public-key base64 fragments, validate the resulting SSH blob, or recover
an exact public key from an explicit known-good inventory matching a required fingerprint.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

KEY_TYPES = {
    "ssh-ed25519", "ssh-rsa",
    "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521",
    "sk-ssh-ed25519@openssh.com", "sk-ecdsa-sha2-nistp256@openssh.com",
}
B64_RE = re.compile(r"^[A-Za-z0-9+/]+={0,2}$")
ZW_CHARS = "\u200b\u200c\u200d\u2060\ufeff"

class KeyErrorSafe(Exception):
    pass

def read_ssh_string(blob: bytes, pos: int) -> tuple[bytes, int]:
    if pos + 4 > len(blob):
        raise KeyErrorSafe("truncated SSH string length")
    n = int.from_bytes(blob[pos:pos+4], "big")
    pos += 4
    if n > len(blob) - pos:
        raise KeyErrorSafe("truncated SSH string data")
    return blob[pos:pos+n], pos+n

def validate_blob(blob: bytes, declared_type: str | None = None) -> str:
    key_type_bytes, p = read_ssh_string(blob, 0)
    try:
        key_type = key_type_bytes.decode("ascii")
    except UnicodeDecodeError as exc:
        raise KeyErrorSafe("SSH key type is not ASCII") from exc
    if key_type not in KEY_TYPES:
        raise KeyErrorSafe("unsupported SSH public key type: " + key_type)
    if declared_type and declared_type != key_type:
        raise KeyErrorSafe("declared type does not match type embedded in public key")
    fields: list[bytes] = []
    while p < len(blob):
        field, p = read_ssh_string(blob, p)
        fields.append(field)
    if key_type == "ssh-ed25519":
        if len(fields) != 1 or len(fields[0]) != 32:
            raise KeyErrorSafe("Ed25519 public key must contain exactly one 32-byte public key field")
    elif key_type == "ssh-rsa":
        if len(fields) != 2 or not all(fields):
            raise KeyErrorSafe("RSA public key must contain exponent and modulus fields")
    elif key_type.startswith("ecdsa-sha2-"):
        expected_curve = key_type.removeprefix("ecdsa-sha2-")
        if len(fields) != 2 or fields[0].decode("ascii", "ignore") != expected_curve or not fields[1]:
            raise KeyErrorSafe("ECDSA public key curve/point fields are malformed")
    elif key_type == "sk-ssh-ed25519@openssh.com":
        if len(fields) not in (2, 3) or len(fields[0]) != 32:
            raise KeyErrorSafe("security-key Ed25519 public key fields are malformed")
    elif key_type == "sk-ecdsa-sha2-nistp256@openssh.com":
        if len(fields) not in (3, 4) or fields[0].decode("ascii", "ignore") != "nistp256":
            raise KeyErrorSafe("security-key ECDSA public key fields are malformed")
    return key_type

def fingerprint(blob: bytes) -> str:
    return "SHA256:" + base64.b64encode(hashlib.sha256(blob).digest()).decode("ascii").rstrip("=")

def parse_public_line(line: str) -> dict | None:
    parts = line.strip().split()
    if len(parts) < 2 or parts[0] not in KEY_TYPES:
        return None
    try:
        blob = base64.b64decode(parts[1].encode("ascii"), validate=True)
        actual_type = validate_blob(blob, parts[0])
    except (ValueError, UnicodeEncodeError, KeyErrorSafe):
        return None
    return {"type": actual_type, "blob": blob, "b64": base64.b64encode(blob).decode("ascii"),
            "comment": " ".join(parts[2:])[:180], "fingerprint": fingerprint(blob)}

def inventory_keys(paths: list[str]) -> list[dict]:
    out=[]
    for item in paths:
        path=Path(item).expanduser()
        if not path.is_file():
            raise KeyErrorSafe("known public-key file does not exist: " + str(path))
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            record=parse_public_line(line)
            if record:
                record["source"]=str(path)
                out.append(record)
    return out

def fragment_candidates(text: str, key_type: str | None) -> list[dict]:
    # Normalize line endings and remove known zero-width presentation characters, but do not
    # transliterate characters into key bytes. Alias-decoding must happen in the LACE layer first.
    normalized=unicodedata.normalize("NFC", text).translate({ord(ch): None for ch in ZW_CHARS})
    found=[]
    for line in normalized.splitlines():
        record=parse_public_line(line)
        if record:
            found.append(record)
    if found:
        return found
    types=[]
    for kind in KEY_TYPES:
        if re.search(r"(?<![A-Za-z0-9@-])"+re.escape(kind)+r"(?![A-Za-z0-9@-])", normalized):
            types.append(kind)
    if key_type:
        types=[key_type]
    # Ignore headings and labels; combine only base64-compatible fragments in displayed order.
    fragments=[]
    for line in normalized.splitlines():
        s=line.strip()
        if not s:
            continue
        s=re.sub(r"^(?:fragment|chunk|part|clip|payload|base64|data)(?:\s*[#:=_-]?\s*\d*)?\s*[:=|>\- ]\s*", "", s, flags=re.I)
        s=re.sub(r"^(?:"+"|".join(re.escape(k) for k in KEY_TYPES)+r")\s+", "", s)
        s=re.sub(r"\s+", "", s)
        if s and re.fullmatch(r"[A-Za-z0-9+/=_-]+", s):
            fragments.append(s.replace("-", "+").replace("_", "/"))
    joined="".join(fragments)
    if not joined:
        return []
    # If only fragments are present, caller must provide an explicit algorithm label.
    candidate_types = types or ([key_type] if key_type else [])
    for kind in candidate_types:
        try:
            if len(joined) % 4 == 1:
                continue
            padded=joined + "=" * ((-len(joined)) % 4)
            blob=base64.b64decode(padded, validate=True)
            actual=validate_blob(blob, kind)
            found.append({"type":actual,"blob":blob,"b64":base64.b64encode(blob).decode("ascii"),
                          "comment":"normalized-public-fragment","fingerprint":fingerprint(blob)})
        except (ValueError, KeyErrorSafe):
            continue
    unique={rec["fingerprint"]:rec for rec in found}
    return list(unique.values())

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fragments", required=True, help="Text file containing wrapped public-key material")
    parser.add_argument("--known-public-key", action="append", default=[], help="Known-good .pub or authorized_keys file; repeatable")
    parser.add_argument("--expected-fingerprint", help="Require this exact OpenSSH SHA256 fingerprint")
    parser.add_argument("--key-type", choices=sorted(KEY_TYPES), help="Required when fragments omit the OpenSSH algorithm label")
    parser.add_argument("--output", help="Write the normalized PUBLIC key to this path (refuses overwrite)")
    args=parser.parse_args()
    fragment_file=Path(args.fragments).expanduser()
    if not fragment_file.is_file():
        print(json.dumps({"ok":False,"status":"INPUT_NOT_FOUND","message":"fragment input file not found"},indent=2));return 2
    try:
        candidates=fragment_candidates(fragment_file.read_text(encoding="utf-8",errors="replace"),args.key_type)
        inventory=inventory_keys(args.known_public_key)
    except (OSError,KeyErrorSafe) as exc:
        print(json.dumps({"ok":False,"status":"INPUT_ERROR","message":str(exc)},indent=2));return 2
    expected=args.expected_fingerprint
    chosen=None;source="fragments"
    for candidate in candidates:
        if not expected or candidate["fingerprint"]==expected:
            chosen=candidate;break
    if chosen is None and expected:
        matches=[key for key in inventory if key["fingerprint"]==expected]
        if len(matches)==1:
            chosen=matches[0];source="known-good-inventory"
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
        public_line=chosen["type"]+" "+chosen["b64"]+(" "+chosen.get("comment","") if chosen.get("comment") else "")+"\n"
        output.write_text(public_line,encoding="utf-8")
        try: output.chmod(0o644)
        except OSError: pass
    print(json.dumps({"ok":True,"status":"PUBLIC_KEY_STRUCTURE_VALIDATED","source":source,"type":chosen["type"],
      "fingerprint":chosen["fingerprint"],"output":str(Path(args.output).expanduser()) if args.output else None,
      "private_key_touched":False,"missing_bytes_invented":False,
      "message":"Public-key blob structure and SHA-256 fingerprint were validated. This utility does not validate ECDSA curve points or authenticate a device. Before trust, run ssh-keygen -lf on the normalized key and verify a fresh challenge signature against an independent allowlist."},indent=2));return 0

if __name__=="__main__":
    raise SystemExit(main())
