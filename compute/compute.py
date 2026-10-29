#!/usr/bin/env python3
"""COMPUTƏ v6: local-only SHA-256 manifest + tamper-evident receipt ledger."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import pathlib
import sys
import time

MAGIC = b"COMPUTE-v6\x00"
ZERO = "0" * 64
STATE = ".compute-v6"
MAX_FILES = 100000

def canonical(obj):
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()

def hash_bytes(data):
    return hashlib.sha256(data).hexdigest()

def file_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as inp:
        for chunk in iter(lambda: inp.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()

def inventory(root):
    output = {}
    for directory, folders, files in os.walk(root, followlinks=False):
        folders[:] = sorted(d for d in folders if d not in {STATE, ".git", "node_modules", ".venv", "__pycache__"} and not (pathlib.Path(directory)/d).is_symlink())
        for filename in sorted(files):
            path = pathlib.Path(directory)/filename
            if path.is_symlink():
                continue
            relative = path.relative_to(root).as_posix()
            # No file content is exported; hashes still depend on local source contents.
            output[relative] = {"sha256": file_hash(path), "bytes": path.stat().st_size}
            if len(output) > MAX_FILES:
                raise ValueError("More than 100000 files; narrow your scope")
    return output

def ledger_path(root):
    return root/STATE/"ledger.jsonl"

def read_ledger(root):
    p = ledger_path(root)
    if not p.exists():
        return []
    return [json.loads(line) for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]

def record_hash(record):
    body = {k:v for k,v in record.items() if k != "hash"}
    return hash_bytes(MAGIC + bytes.fromhex(body["previous_hash"]) + canonical(body))

def check_chain(records):
    prev = ZERO
    for n, record in enumerate(records, 1):
        if record.get("sequence") != n or record.get("previous_hash") != prev:
            raise ValueError("Broken chain or record sequence")
        if record.get("hash") != record_hash(record):
            raise ValueError("Invalid receipt hash")
        prev = record["hash"]
    return prev

def atomic_json(path, data):
    temp = path.with_suffix(".tmp")
    temp.write_bytes(canonical(data) + b"\n")
    temp.replace(path)

def execute(root, command):
    state_dir = root/STATE
    seed_file = state_dir/"seed.json"
    records = read_ledger(root)
    tip = check_chain(records)
    contents = inventory(root)
    artifact_root = hash_bytes(canonical(contents))
    if command == "init":
        if state_dir.exists():
            raise ValueError("State directory already exists: refusing reinitialization")
        state_dir.mkdir(mode=0o700)
        entry = {"sequence":1,"timestamp_ns":time.time_ns(),"event":"GENESIS","previous_hash":ZERO,"manifest_sha256":artifact_root}
        entry["hash"] = record_hash(entry)
        with ledger_path(root).open("x", encoding="utf-8") as out:
            out.write(canonical(entry).decode()+"\n")
        atomic_json(seed_file, {"version":"v6", "genesis_hash":entry["hash"],"manifest_sha256":artifact_root})
        return {"status":"initialized","receipt":entry["hash"],"manifest_sha256":artifact_root}
    if not records or not seed_file.exists():
        raise ValueError("No seed available; initialize first")
    seed = json.loads(seed_file.read_text(encoding="utf-8"))
    if records[0]["hash"] != seed["genesis_hash"] or records[0]["manifest_sha256"] != seed["manifest_sha256"]:
        raise ValueError("Genesis seed disagreement")
    if command == "verify":
        if records[-1]["manifest_sha256"] != artifact_root:
            raise ValueError("Current content differs from most recent recorded manifest")
        return {"status":"verified","receipt":tip,"manifest_sha256":artifact_root,"records":len(records)}
    if command == "status":
        return {"status":"changed" if records[-1]["manifest_sha256"] != artifact_root else "verified","receipt":tip,"manifest_sha256":artifact_root,"records":len(records)}
    if command == "seal":
        # Baseline changes are always explicit; prior ledger verifies before append.
        entry = {"sequence":len(records)+1,"timestamp_ns":time.time_ns(),"event":"CHECKPOINT","previous_hash":tip,"manifest_sha256":artifact_root}
        entry["hash"]=record_hash(entry)
        with ledger_path(root).open("a",encoding="utf-8") as out:
            out.write(canonical(entry).decode()+"\n")
            out.flush()
            os.fsync(out.fileno())
        return {"status":"sealed","receipt":entry["hash"],"manifest_sha256":artifact_root}
    raise ValueError("Unknown command")

def main():
    parser=argparse.ArgumentParser(description="Computə local SHA-256 seed verifier")
    parser.add_argument("command",choices=["init","verify","status","seal"])
    parser.add_argument("--root",required=True,type=pathlib.Path)
    args=parser.parse_args()
    root=args.root.expanduser().resolve(strict=True)
    if not root.is_dir():
        parser.error("Root must be a directory")
    try:
        print(json.dumps(execute(root,args.command),ensure_ascii=False,indent=2))
    except (ValueError,OSError,KeyError,TypeError) as error:
        print(json.dumps({"status":"BLOCKED","error":str(error)}),file=sys.stderr)
        sys.exit(1)

if __name__=="__main__":
    main()
