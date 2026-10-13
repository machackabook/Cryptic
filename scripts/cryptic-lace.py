#!/usr/bin/env python3
"""HULE/LACE reversible, compression-first linguistic presentation for Cryptic metadata.

Cryptographic keys and signatures are never translated. Canonical bytes are carried in a
zlib + base64url envelope. ZWJ glyph chains and SVG clip paths are presentation/fingerprint
surfaces, not encryption, authentication, or the source of truth.
"""
from __future__ import annotations
import argparse, base64, hashlib, json, sys, unicodedata, zlib
from pathlib import Path
SCHEMA="cryptic.hule.v1"
ZWJ="\u200d"

def b64u(raw: bytes) -> str: return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
def unb64u(text: str) -> bytes:
    clean="".join(text.split())
    return base64.urlsafe_b64decode(clean+"="*((-len(clean))%4))
def alias_view(text: str) -> str:
    # Display-only motif; original code points remain in the compressed canonical payload.
    return text.replace("A","A"+ZWJ+"ª"+ZWJ+"Å")
def clip_path_for_digest(digest_hex: str) -> str:
    raw=bytes.fromhex(digest_hex)[:24]
    pts=[(4+(i%8)*8,4+(b%8)*8) for i,b in enumerate(raw)]
    return "M"+" L".join(f"{x} {y}" for x,y in pts)+" Z" if pts else "M0 0"
def make_envelope(data: bytes, label: str) -> dict:
    compressed=zlib.compress(data,level=9);digest=hashlib.sha256(data).hexdigest()
    try:
        text=data.decode("utf-8");presentation=alias_view(text);codepoints=[f"U+{ord(ch):04X}" for ch in text]
    except UnicodeDecodeError: presentation="[binary payload — no linguistic glyph view]";codepoints=[]
    return {"schema":SCHEMA,"codec":"zlib+base64url","label":unicodedata.normalize("NFC",label)[:120],
      "payload":b64u(compressed),"sha256":digest,"original_bytes":len(data),"compressed_bytes":len(compressed),
      "linguistic_view":presentation,"codepoints":codepoints,
      "zwj_policy":"presentation-only; canonical compressed payload bytes are unchanged",
      "alias_rule":"A -> A U+200D ª U+200D Å (display only; U+0041 remains canonical)",
      "clip_path_fingerprint":"M0 0","security_note":"not encryption; sign canonical bytes with an SSH identity"}
def decode_envelope(obj: dict) -> bytes:
    if obj.get("schema")!=SCHEMA or obj.get("codec")!="zlib+base64url": raise ValueError("unsupported HULE schema or codec")
    raw=zlib.decompress(unb64u(str(obj["payload"])))
    if hashlib.sha256(raw).hexdigest()!=obj.get("sha256"): raise ValueError("canonical payload SHA-256 mismatch")
    if len(raw)!=int(obj.get("original_bytes",-1)): raise ValueError("canonical payload length mismatch")
    return raw
def main() -> int:
    ap=argparse.ArgumentParser(description=__doc__);sub=ap.add_subparsers(dest="command",required=True)
    enc=sub.add_parser("encode");enc.add_argument("input");enc.add_argument("--label",default="cryptic-message");enc.add_argument("--output",required=True)
    dec=sub.add_parser("decode");dec.add_argument("input");dec.add_argument("--output",required=True)
    ver=sub.add_parser("verify");ver.add_argument("input")
    args=ap.parse_args()
    try:
        if args.command=="encode":
            raw=sys.stdin.buffer.read() if args.input=="-" else Path(args.input).expanduser().read_bytes()
            obj=make_envelope(raw,args.label)
            compressed=unb64u(obj["payload"])
            obj["clip_path_fingerprint"]=clip_path_for_digest(hashlib.sha256(compressed).hexdigest())
            target=Path(args.output).expanduser()
            if target.exists(): raise FileExistsError("refusing to overwrite existing envelope")
            target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
            print(json.dumps({"ok":True,"status":"ENCODED","output":str(target),"original_bytes":len(raw),"compressed_bytes":obj["compressed_bytes"],"sha256":obj["sha256"],"clip_path_fingerprint":obj["clip_path_fingerprint"],"note":obj["security_note"]},indent=2));return 0
        obj=json.loads(Path(args.input).expanduser().read_text(encoding="utf-8"));raw=decode_envelope(obj)
        if args.command=="verify":
            print(json.dumps({"ok":True,"status":"DIGEST_VALID","sha256":obj["sha256"],"original_bytes":len(raw),"private_key_touched":False},indent=2));return 0
        target=Path(args.output).expanduser()
        if target.exists(): raise FileExistsError("refusing to overwrite existing decoded output")
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
        print(json.dumps({"ok":True,"status":"DECODED_AND_VERIFIED","output":str(target),"bytes":len(raw),"sha256":obj["sha256"]},indent=2));return 0
    except (OSError,ValueError,KeyError,zlib.error,json.JSONDecodeError) as e:
        print(json.dumps({"ok":False,"status":"ERROR","message":str(e)[:240]},indent=2),file=sys.stderr);return 2
if __name__=="__main__": raise SystemExit(main())
