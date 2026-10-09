#!/usr/bin/env python3
"""Owner tool: refresh standalone updater data after editing patches/runtime/config."""
from pathlib import Path
import ast, base64, json, zlib
root=Path(__file__).resolve().parent.parent
path=root/'tools/update_payload.py'
source=path.read_text()
old=None
for node in ast.parse(source).body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='OWNER_DATA' for t in node.targets):
        old=ast.literal_eval(node.value)
if old is None:raise SystemExit('OWNER_DATA assignment not found')
files={name:(root/name).read_text() for name in ['integration/patch_dynamons.py','integration/patches.json','integration/brand.json','integration/menu_config.json','integration/catalog.json','tests/bootstrap.js']}
encoded=base64.b64encode(zlib.compress(json.dumps(files).encode(),9)).decode()
needle='OWNER_DATA = "'+old+'"'
if needle not in source:raise SystemExit('Unexpected updater formatting')
path.write_text(source.replace(needle,'OWNER_DATA = "'+encoded+'"',1))
print('Standalone owner updater refreshed. No keys or payload were uploaded.')
