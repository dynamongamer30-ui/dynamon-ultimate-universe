#!/usr/bin/env python3
"""Apply every supplied patch, reject failures/overlaps, append headless engine and bridge.
This writes an unsigned payload. Use your EXISTING signing key in build_loader.py.
"""
import argparse,hashlib,importlib.util,json
from pathlib import Path
r=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--original',type=Path,required=True);p.add_argument('--out',type=Path,default=r/'dist/dynamons_world_native.js');a=p.parse_args()
if a.original.resolve()==a.out.resolve():raise SystemExit('Output must not overwrite original')
mod=importlib.util.spec_from_file_location('patch_engine',r/'integration/patch_dynamons.py');engine=importlib.util.module_from_spec(mod);mod.loader.exec_module(engine)
raw=a.original.read_bytes();text=raw.decode('utf-8');rules=json.loads((r/'integration/patches.json').read_text())['rules'];edits=[]
for rule in rules:
 status,info,_=engine.locate(text,rule)
 if status!='ok':raise SystemExit('Rule %s failed: %s; no payload written'%(rule['id'],info))
 edits.append((info.start(),info.end(),engine.apply_segs(info,rule['repl_segs']),rule['id']))
edits.sort()
for last,current in zip(edits,edits[1:]):
 if current[0]<last[1]:raise SystemExit('Overlapping rules %s/%s; no payload written'%(last[3],current[3]))
for start,end,replacement,_ in reversed(edits):text=text[:start]+replacement+text[end:]
script=(r/'tests/bootstrap.js').read_text();brand=json.loads((r/'integration/brand.json').read_text());result=(text+'\n;\nwindow.__DG_BRAND='+json.dumps(brand,ensure_ascii=True)+';\nwindow.__DG_MENU_CONFIG='+json.dumps(json.loads((r/'integration/menu_config.json').read_text()),ensure_ascii=True)+';\nwindow.__DG_CATALOG='+json.dumps(json.loads((r/'integration/catalog.json').read_text()),ensure_ascii=True)+';\n'+script+'\n').encode('utf-8')
a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_bytes(result)
report={'original_sha256':hashlib.sha256(raw).hexdigest(),'payload_sha256':hashlib.sha256(result).hexdigest(),'rules_applied':len(edits),'overlaps':0,'payload_bytes':len(result),'encrypted':False,'signed':False}
a.out.with_suffix('.report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
