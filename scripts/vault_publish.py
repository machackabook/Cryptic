#!/usr/bin/env python3
"""[SS][TDOC-CRYPTIC-VAULT-PUBLISH-V1.1] Validate a human-approved public release list.

No Drive authentication, recursive sync, or automatic public export.
Only explicitly approved *local* artifacts can become public site content.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile

SCHEMA = 'cryptic.public-vault.approval.v1'
CATALOG = 'cryptic.public-vault.catalog.v1'
FILE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,100}\.(?:pdf|txt|md)$', re.I)
HASH = re.compile(r'^[0-9a-f]{64}$')
CODE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._:-]{2,100}$')
MAX_SIZE = 8 * 1024 * 1024
LIMIT = 40

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def public_text(value, field, max_length=160):
    if not isinstance(value, str) or not (1 <= len(value) <= max_length):
        raise ValueError(f'{field}: missing or too long')
    if any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError(f'{field}: control character')
    return value

def validate(spec: dict, source: Path) -> list[dict]:
    if not isinstance(spec, dict) or spec.get('schema') != SCHEMA:
        raise ValueError('Incorrect release manifest schema')
    rows = spec.get('releases')
    if not isinstance(rows, list) or len(rows) > LIMIT:
        raise ValueError('Release count invalid; max 40')
    entries = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Each release must be an object')
        name = row.get('file')
        if not isinstance(name, str) or not FILE.fullmatch(name) or name in seen:
            raise ValueError('Unsafe or duplicate filename')
        seen.add(name)
        if row.get('classification') != 'public' or row.get('publication') != 'approved_public':
            raise ValueError(name + ': explicit public classification and approval are mandatory')
        digest = row.get('sha256')
        if not isinstance(digest, str) or not HASH.fullmatch(digest):
            raise ValueError(name + ': valid SHA-256 required')
        if not CODE.fullmatch(str(row.get('approval_id') or '')):
            raise ValueError(name + ': explicit approval receipt ID required')
        if not CODE.fullmatch(str(row.get('tdoc_id') or '')):
            raise ValueError(name + ': explicit TDOC ID required')
        title = public_text(row.get('title'), 'title')
        src = source / name
        if src.is_symlink() or not src.is_file() or src.resolve().parent != source.resolve():
            raise ValueError(name + ': file missing, symlink, or outside source')
        if src.stat().st_size > MAX_SIZE:
            raise ValueError(name + ': file exceeds 8 MiB')
        if sha256(src) != digest:
            raise ValueError(name + ': SHA-256 mismatch')
        entries.append({'file':name,'title':title,'tdoc_id':row['tdoc_id'],'approval_id':row['approval_id'],
                        'sha256':digest,'publication':'approved_public'})
    return entries

def publish(spec_path: Path, source: Path, site: Path) -> dict:
    spec_path = spec_path.resolve()
    source = source.resolve()
    if not spec_path.is_file() or not source.is_dir() or not (site / 'index.html').exists():
        raise ValueError('Release specification, staged source, or site root missing')
    spec = json.loads(spec_path.read_text(encoding='utf-8'))
    entries = validate(spec, source)
    assets = site / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    # Refuse mutable existing assets: published SHA IDs and files cannot be silently replaced.
    for entry in entries:
        dst = assets / entry['file']
        if dst.exists() and (dst.is_symlink() or sha256(dst) != entry['sha256']):
            raise ValueError(entry['file'] + ': public asset name already exists with different bytes')
    for entry in entries:
        dst = assets / entry['file']
        if not dst.exists():
            temp = assets / ('.staging-'+entry['file'])
            shutil.copyfile(source/entry['file'], temp)
            if sha256(temp) != entry['sha256']:
                temp.unlink(missing_ok=True)
                raise ValueError('Copy integrity failure')
            os.replace(temp,dst)
    cat = {'schema':CATALOG,'version':'1.1.0','visibility':'public',
           'generated_utc':dt.datetime.now(dt.timezone.utc).isoformat(),
           'documents':entries,'notice':'Approved public releases only; private Drive is not browsable here.'}
    fd,tmp=tempfile.mkstemp(prefix='.catalog-',dir=site)
    with os.fdopen(fd,'w',encoding='utf-8') as out:
        json.dump(cat,out,indent=2,ensure_ascii=False)
        out.write('\n');out.flush();os.fsync(out.fileno())
    os.replace(tmp,site/'catalog.json')
    return cat

def main():
    p=argparse.ArgumentParser(description='Explicit approval-gated public vault publisher')
    p.add_argument('--approvals',required=True,type=Path,help='Private, operator-signed-off release list')
    p.add_argument('--staging',required=True,type=Path,help='Locally inspected files, not the whole Drive')
    p.add_argument('--site',default=Path(__file__).resolve().parent.parent/'vault',type=Path)
    a=p.parse_args()
    cat=publish(a.approvals,a.staging,a.site)
    print(json.dumps({'catalog':'vault/catalog.json','published':len(cat['documents']),
                      'note':'Generated files still require git diff review and explicit public PR approval.'},indent=2))

if __name__=='__main__': main()