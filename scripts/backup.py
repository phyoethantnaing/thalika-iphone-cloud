#!/usr/bin/env python3
"""Create a private backup; restoration always targets a new empty directory."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tarfile
import time

p=argparse.ArgumentParser()
p.add_argument('action',choices=['backup','restore','verify'])
p.add_argument('archive',type=Path)
p.add_argument('--root',type=Path,default=Path(os.environ.get('THALIKA_PERSISTENT_ROOT','/workspace/persistent')))
p.add_argument('--confirm-quiescent',action='store_true',help='Confirm all writers are stopped before backup')
p.add_argument('--include-models',action='store_true')
a=p.parse_args()
os.umask(0o077)
if a.action=='backup':
    if not a.confirm_quiescent: p.error('Stop generation and all writers; pass --confirm-quiescent')
    if a.archive.exists(): p.error('Archive exists; choose a new path')
    root=a.root.resolve()
    if a.archive.resolve().is_relative_to(root): p.error('Write backup outside persistent root')
    names=['data','config']+(['models'] if a.include_models else [])
    with tarfile.open(a.archive,'w:gz') as tar:
        for name in names:
            source=root/name
            if source.exists(): tar.add(source,arcname=name,filter=lambda info: None if info.issym() or info.islnk() or info.name.endswith('.lock') else info)
    checksum=hashlib.file_digest(a.archive.open('rb'), 'sha256').hexdigest()
    a.archive.with_suffix(a.archive.suffix+'.sha256').write_text(checksum+'\n')
    print('Private backup created. Encrypt before copying off-host. Models included:',a.include_models)
elif a.action=='verify':
    expected=a.archive.with_suffix(a.archive.suffix+'.sha256').read_text().strip()
    if hashlib.file_digest(a.archive.open('rb'), 'sha256').hexdigest()!=expected: raise SystemExit('Checksum mismatch')
    with tarfile.open(a.archive) as tar:
        for item in tar.getmembers():
            if item.issym() or item.islnk() or item.isdev() or Path(item.name).is_absolute() or '..' in Path(item.name).parts: raise SystemExit('Unsafe archive member')
    print('Checksum and archive paths verified')
else:
    # Restores NEVER overwrite a directory, even if it is empty.
    if a.root.exists(): p.error('Restore root already exists. Choose a new directory.')
    with tarfile.open(a.archive) as tar:
        for item in tar.getmembers():
            if not (item.isfile() or item.isdir()) or Path(item.name).is_absolute() or '..' in Path(item.name).parts: raise SystemExit('Unsafe archive member')
        a.root.mkdir(parents=True,mode=0o700)
        tar.extractall(a.root,filter='data')
    print('Restored into a new directory. Review ownership and secrets before attaching to compute.')
