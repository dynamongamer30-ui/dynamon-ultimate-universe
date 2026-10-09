"""Rule generation: diff hunk -> generalized regex find + structured replacement.
Adaptive context widening guarantees each rule matches exactly once; exact-match
fallback (flagged version-fragile) guarantees correctness if generalization fails.
No literal backslashes typed here (re.escape + structured replacement segments)."""
import re, difflib

KEYWORDS = set(("function return var let const if else for while do switch case break continue "
    "new this typeof instanceof in of void delete null true false try catch finally throw "
    "default window document Math JSON").split())

IDENT = re.compile("[A-Za-z_$][A-Za-z0-9_$]*")
GRP   = "[A-Za-z_$][A-Za-z0-9_$]*"
CTX_STEPS_GEN   = (20, 45, 90, 180, 360, 700)
CTX_STEPS_EXACT = (45, 90, 180, 360, 700, 1400, 2800)

def is_volatile(tok):
    if tok in KEYWORDS: return False
    return len(tok) <= 2

def _emit_equal(atext, find_parts, repl_segs, gc, stable):
    pos = 0
    for m in IDENT.finditer(atext):
        if m.start() > pos:
            lit = atext[pos:m.start()]; find_parts.append(re.escape(lit)); repl_segs.append({"lit": lit}); stable.append(lit)
        tok = m.group(0)
        if is_volatile(tok):
            name = "g%d" % gc[0]; gc[0] += 1
            find_parts.append("(?P<%s>%s)" % (name, GRP)); repl_segs.append({"grp": name})
        else:
            find_parts.append(re.escape(tok)); repl_segs.append({"lit": tok}); stable.append(tok)
        pos = m.end()
    if pos < len(atext):
        lit = atext[pos:]; find_parts.append(re.escape(lit)); repl_segs.append({"lit": lit}); stable.append(lit)

def _emit_consume(atext, find_parts, gc):
    pos = 0
    for m in IDENT.finditer(atext):
        if m.start() > pos: find_parts.append(re.escape(atext[pos:m.start()]))
        tok = m.group(0)
        if is_volatile(tok):
            name = "g%d" % gc[0]; gc[0] += 1; find_parts.append("(?P<%s>%s)" % (name, GRP))
        else:
            find_parts.append(re.escape(tok))
        pos = m.end()
    if pos < len(atext): find_parts.append(re.escape(atext[pos:]))

def _build_generalized(a, b, a0, a1, b0, b1, ctx):
    la = max(0, a0 - ctx); ra = min(len(a), a1 + ctx)
    lb = max(0, b0 - ctx); rb = min(len(b), b1 + ctx)
    a_seg = a[la:ra]; b_seg = b[lb:rb]
    sm = difflib.SequenceMatcher(None, a_seg, b_seg, autojunk=False)
    fp = []; rs = []; gc = [0]; stable = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        at = a_seg[i1:i2]; bt = b_seg[j1:j2]
        if   tag == "equal":   _emit_equal(at, fp, rs, gc, stable)
        elif tag == "replace": _emit_consume(at, fp, gc); rs.append({"lit": bt})
        elif tag == "delete":  _emit_consume(at, fp, gc)
        elif tag == "insert":  rs.append({"lit": bt})
    anchor = max(stable, key=len) if stable else a[a0:a1]
    return {"find": "".join(fp), "repl_segs": rs, "anchor": anchor, "expect": b_seg}

def _build_exact(a, b, a0, a1, b0, b1, ctx):
    la = max(0, a0 - ctx); ra = min(len(a), a1 + ctx)
    lb = max(0, b0 - ctx); rb = min(len(b), b1 + ctx)
    a_seg = a[la:ra]; b_seg = b[lb:rb]
    return {"find": re.escape(a_seg), "repl_segs": [{"lit": b_seg}], "anchor": a_seg, "expect": b_seg}

def count_matches(text, find, anchor, radius):
    """Fast count via literal anchor windows."""
    rx = re.compile(find)
    if not anchor:
        return len(rx.findall(text)), rx
    seen = set(); start = 0
    while True:
        p = text.find(anchor, start)
        if p < 0: break
        w0 = max(0, p - radius); w1 = min(len(text), p + radius)
        m = rx.search(text, w0, w1)
        if m: seen.add(m.start())
        start = p + 1
    return len(seen), rx


def _verify(text, rule, radius):
    """Return True iff rule matches exactly once AND reproduces rule['expect']."""
    try:
        rx = re.compile(rule["find"])
    except re.error:
        return False
    anc = rule["anchor"]; seen=[]; start=0
    while True:
        p = text.find(anc, start)
        if p < 0: break
        m = rx.search(text, max(0,p-radius), min(len(text),p+radius))
        if m and (not seen or m.start()!=seen[-1].start()): seen.append(m)
        start = p + 1
    if len(seen) != 1: return False
    return apply_segs(seen[0], rule["repl_segs"]) == rule["expect"]

def make_rule(a, b, a0, a1, b0, b1):
    core_len = (a1 - a0)
    # 1) generalized, widening context until unique in original
    for ctx in CTX_STEPS_GEN:
        r = _build_generalized(a, b, a0, a1, b0, b1, ctx)
        radius = core_len + 2*ctx + 40
        if _verify(a, r, radius):
            r.update(strategy="generalized", ctx=ctx, a_pos=a0,
                     orig_core=a[a0:a1], patch_core=b[b0:b1], radius=radius); return r
    # 2) exact fallback (version-fragile), widening until unique
    for ctx in CTX_STEPS_EXACT:
        r = _build_exact(a, b, a0, a1, b0, b1, ctx)
        radius = core_len + 2*ctx + 40
        if _verify(a, r, radius):
            r.update(strategy="exact", ctx=ctx, a_pos=a0,
                     orig_core=a[a0:a1], patch_core=b[b0:b1], radius=radius); return r
    # 3) give up unique - return widest exact, mark ambiguous
    r = _build_exact(a, b, a0, a1, b0, b1, CTX_STEPS_EXACT[-1])
    r.update(strategy="ambiguous", ctx=CTX_STEPS_EXACT[-1], a_pos=a0,
             orig_core=a[a0:a1], patch_core=b[b0:b1], radius=core_len+6000); return r

def apply_segs(m, repl_segs):
    out = []
    for seg in repl_segs:
        out.append(seg["lit"] if "lit" in seg else m.group(seg["grp"]))
    return "".join(out)

# ==========================================================================
#  patch_dynamons.py  -  re-applyable mod patcher for Dynamons World
#  Modes: derive | apply | verify
#  (engine above is proven byte-exact; CLI below adds naming/report/JSON)
# ==========================================================================
import sys, json, argparse, time, os

ESC=chr(27); NL=chr(10)
def _c(code): return ESC+"["+code+"m"
GREEN=_c("92"); RED=_c("91"); YEL=_c("93"); CYA=_c("96"); DIM=_c("90"); BOLD=_c("1"); RST=_c("0")
NOCOLOR=False
def col(s,c):
    return s if NOCOLOR else c+s+RST

def sp(*a):
    """crash-proof print: never dies on weird unicode in any terminal."""
    try:
        print(*a)
    except Exception:
        print(*[str(x).encode("ascii","replace").decode("ascii") for x in a])

def kgram_diff(a, b, K=24, max_skip=300000):
    """Fast k-gram anchored diff. Returns hunks as (a0,a1,b0,b1)."""
    import bisect
    idx={}
    for p in range(0,len(b)-K+1):
        idx.setdefault(b[p:p+K],[]).append(p)
    hunks=[]; i=j=0; na=nb=len(a); nb=len(b)
    while i<na and j<nb:
        if a[i]==b[j]: i+=1; j+=1; continue
        best=None; di=0
        while di<max_skip and (i+di+K)<=na:
            pos=idx.get(a[i+di:i+di+K])
            if pos:
                k=bisect.bisect_left(pos,j)
                if k<len(pos):
                    pB=pos[k]; cost=di+(pB-j)
                    if best is None or cost<best[0]: best=(cost,i+di,pB)
                    if best and di>best[0]+64: break
            di+=1
        if best is None: hunks.append((i,na,j,nb)); break
        _,ai,bj=best; hunks.append((i,ai,j,bj)); i,j=ai,bj
    if i<na or j<nb: hunks.append((i,na,j,nb))
    return hunks

# ---- feature naming: infer a human label from the patched code ----
FLAG_NAMES={
 "fullheal":"Full Heal (potions=100%)","statcap":"Stat Cap Override",
 "pvpcd":"PvP Cooldown Skip","turnreset":"Turn Reset","items5":"5x Item Use",
 "itemtimer":"Item Timer Skip","nickval":"Nickname Validation Bypass",
 "nicklen":"Nickname Length Unlock","maxdef":"Max Defense Cap",
}
def name_feature(patch_core):
    pc=patch_core
    if "dw_panel" in pc or ("createElement" in pc and "appendChild" in pc):
        return "Mod Menu UI (panel/tabs/branding)"
    for f,label in FLAG_NAMES.items():
        if "__DGF."+f in pc or "__DGF&&window.__DGF."+f in pc:
            return label+"  [flag: "+f+"]"
    import re as _re
    m=_re.search("__DG[F_]?[.]([A-Za-z0-9_]+)",pc)
    if m: return "Feature flag: "+m.group(1)
    m=_re.search('"([A-Za-z][A-Za-z0-9_ ]{3,40})"',pc)
    if m: return "near string: "+m.group(1)
    return "inline logic edit"

# ---- locate a rule's single match in arbitrary text (future version) ----
def locate(text, rule):
    import re as _re
    try: rx=_re.compile(rule["find"])
    except _re.error as e: return ("badregex",str(e),None)
    anc=rule["anchor"]; rad=rule["radius"]
    if anc and anc in text:
        seen=[]; start=0
        while True:
            p=text.find(anc,start)
            if p<0: break
            m=rx.search(text,max(0,p-rad),min(len(text),p+rad))
            if m and (not seen or m.start()!=seen[-1].start()): seen.append(m)
            start=p+1
        if len(seen)==1: return ("ok",seen[0],None)
        if len(seen)==0: return ("nomatch","regex found 0 near anchor",None)
        return ("multi","regex matched %d times"%len(seen),None)
    # anchor missing -> do NOT run a full-file regex (can hang on a 5MB minified file).
    # If the stable anchor isn't present, the rule cannot reliably apply in this version.
    return ("nomatch","stable anchor not found in target (feature renamed or absent)",None)

def lineno(text,off): return text.count(NL,0,off)+1

# ============================ DERIVE ============================
def _locate_all(text, rule):
    import re as _re
    rx=_re.compile(rule["find"]); anc=rule["anchor"]; radius=rule["radius"]
    start=0; hits=[]; seen=set()
    while True:
        p=text.find(anc,start)
        if p<0: break
        m=rx.search(text,max(0,p-radius),min(len(text),p+radius))
        if m and m.start() not in seen: seen.add(m.start()); hits.append(m)
        start=p+1
    return hits

def derive(args):
    a=open(args.original,encoding="utf-8",errors="replace").read()
    b=open(args.patch,encoding="utf-8",errors="replace").read()
    print(col("[derive] ",CYA)+"orig=%d patch=%d delta=%+d"%(len(a),len(b),len(b)-len(a)))
    t0=time.time()
    hunks=kgram_diff(a,b,K=24)
    print("[derive] %d raw change hunks"%len(hunks))
    # merge-convergence loop: combine hunks whose MATCH spans overlap
    for it in range(15):
        rules=[make_rule(a,b,*h) for h in hunks]
        order=[]
        for h,r in zip(hunks,rules):
            hits=_locate_all(a,r)
            m=hits[0] if len(hits)==1 else None
            order.append({"h":h,"s":(m.start() if m else None),"e":(m.end() if m else None)})
        order.sort(key=lambda e:e["h"][0])
        merged=[]; changed=False; i=0
        while i<len(order):
            cur=order[i]; ca0,ca1,cb0,cb1=cur["h"]; cur_e=cur["e"]; j=i+1
            while j<len(order):
                nx=order[j]
                if cur_e is not None and nx["s"] is not None and nx["s"]<cur_e:
                    na0,na1,nb0,nb1=nx["h"]; ca1=max(ca1,na1); cb1=max(cb1,nb1)
                    cur_e=nx["e"] if nx["e"] is not None else cur_e; changed=True; j+=1
                else: break
            merged.append((ca0,ca1,cb0,cb1)); i=j
        hunks=merged
        if not changed:
            print("[derive] merged to %d hunks (%d iters)"%(len(hunks),it)); break
    rules=[]
    for idx,h in enumerate(hunks):
        r=make_rule(a,b,*h)
        r["id"]=idx; r["feature"]=name_feature(r["patch_core"])
        rules.append(r)
    out={"version":1,"source":{"original":os.path.basename(args.original),
         "patch":os.path.basename(args.patch)},"rules":rules}
    json.dump(out,open(args.out,"w",encoding="utf-8"))
    g=sum(1 for r in rules if r["strategy"]=="generalized")
    e=sum(1 for r in rules if r["strategy"]=="exact")
    am=sum(1 for r in rules if r["strategy"]=="ambiguous")
    print(NL+col(BOLD+"=== FEATURES DERIVED ==="+RST,BOLD))
    for r in rules:
        tag={"generalized":col("GEN ",GREEN),"exact":col("EXACT",YEL),"ambiguous":col("AMBIG",RED)}[r["strategy"]]
        print(" #%2d [%s] %s"%(r["id"],tag,r["feature"]))
    print(NL+"[derive] %s generalized, %s exact(fragile), %s ambiguous  in %.1fs"%(
        col(str(g),GREEN),col(str(e),YEL),col(str(am),RED if am else DIM),time.time()-t0))
    if e or am:
        print(col("[warn] exact/ambiguous rules may break on big rewrites; re-derive if they fail.",YEL))
    print("[derive] wrote "+args.out)
    return 0

# ============================ APPLY ============================
def extract_content(jpath):
    d=json.load(open(jpath,encoding="utf-8"))
    def ids(key):
        v=d.get(key,[])
        return [x.get("id") for x in v if isinstance(x,dict) and x.get("id") is not None] if isinstance(v,list) else []
    mons=ids("mons")+ids("hiddenMons")
    items=ids("items")
    suits=ids("suits")
    emotes=[i for i in items if isinstance(i,str) and i.startswith("emote")]
    nodes=d.get("mapNodes",[]); ncount=len(nodes) if isinstance(nodes,list) else 0
    return {"mons":mons,"items":items,"skins":suits,"emotes":emotes,"_nodes":ncount}


def fail_context(text, rule, width=80):
    """For a failed rule, locate any distinctive STABLE token in the target and
    return surrounding code. Tells an AI exactly what the current code looks like,
    or confirms the feature is absent (mod-internal payload -> needs injection)."""
    import re as _re
    words=set()
    for srcstr in (rule.get("anchor",""), rule.get("orig_core","")):
        for w in _re.findall("[A-Za-z_$][A-Za-z0-9_$]{4,}", srcstr or ""):
            words.add(w)
    for w in sorted(words,key=len,reverse=True):
        i=text.find(w)
        if i>=0:
            seg=text[max(0,i-width):i+width].replace(chr(10)," ")
            return "found '%s' in target -> ...%s..."%(w,seg)
    return "NONE of this rule's tokens exist in target -> feature is mod-internal (needs INJECTION, not an edit)."

def inject_mod_menu(out_text):
    """Append the mod menu overlay from mod_menu.js (single source of truth).
    The menu is NOT stored in patches.json -- rule 27 now injects only the small
    error overlay (which ends with ")();\\n\\n;\\n"), and the menu follows it.
    Edit mod_menu.js and re-run apply to get a perfect payload every time."""
    import os as _os
    base = _os.path.dirname(_os.path.abspath(__file__))
    mpath = _os.path.join(base, "mod_menu.js")
    if not _os.path.exists(mpath):
        print(col("[menu] mod_menu.js not found next to script; skipping menu injection", YEL))
        return out_text
    with open(mpath, "r", encoding="utf-8") as _f:
        menu = _f.read()
    out_text = out_text + menu
    print(col("[menu] injected mod_menu.js (" + str(len(menu)) + " chars) at EOF", GREEN))
    return out_text


def maybe_inject_debug(out_text):
    """Optionally re-inject the private debug section at apply time.
    The debug feature code is NOT stored in this script or in patches.json.
    It lives in debug_section.json (kept private, not distributed). When that
    file is present and the operator answers yes, its injections are applied."""
    base = os.path.dirname(os.path.abspath(__file__))
    dpath = os.path.join(base, "debug_section.json")
    if not os.path.exists(dpath):
        return out_text
    try:
        ans = ""
        if sys.stdin and sys.stdin.isatty():
            ans = input("Include debug section? [y/N]: ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        ans = ""
    if ans not in ("y", "yes"):
        return out_text
    try:
        cfg = json.load(open(dpath, encoding="utf-8"))
    except Exception as e:
        sys.stderr.write("[debug] could not read debug_section.json: %s\n" % e)
        return out_text
    done = 0
    for inj in cfg.get("injections", []):
        anchor = inj.get("anchor", "")
        ins = inj.get("insert", "")
        pos = inj.get("position", "after")
        n = out_text.count(anchor)
        if not anchor or n != 1:
            sys.stderr.write("[debug] skip injection: anchor count=%d\n" % n)
            continue
        i = out_text.index(anchor)
        if pos == "before":
            out_text = out_text[:i] + ins + out_text[i:]
        else:
            j = i + len(anchor)
            out_text = out_text[:j] + ins + out_text[j:]
        done += 1
    print("[debug] injected %d section(s)" % done)
    return out_text

def apply(args):
    text=open(args.original,encoding="utf-8",errors="replace").read()
    man=json.load(open(args.rules,encoding="utf-8"))
    rules=man["rules"]
    print(col("[apply] ",CYA)+"target=%s (%d chars), %d rules"%(os.path.basename(args.original),len(text),len(rules)))
    print()
    edits=[]; ok=0; fail=0
    for r in rules:
        try:
            status,info,note=locate(text,r)
        except Exception as _ex:
            sp(col(" FAIL",RED)+" #%2d        %s  (error: %s)"%(r.get("id","?"),r.get("feature","?"),str(_ex)[:60])); fail+=1; continue
        if status=="ok":
            m=info; newseg=apply_segs(m,r["repl_segs"])
            edits.append((m.start(),m.end(),newseg))
            ln=lineno(text,m.start())
            extra=col(" ("+note+")",DIM) if note else ""
            print(col(" OK  ",GREEN)+"#%2d L%-7d %s%s"%(r["id"],ln,r["feature"],extra))
            ok+=1
        else:
            sp(col(" FAIL",RED)+" #%2d        %s"%(r["id"],r["feature"]))
            sp(col("       reason: "+info,RED))
            sp(col("       anchor: "+repr(r["anchor"][:60]),DIM))
            sp(col("       regex : "+r["find"][:120],DIM))
            sp(col("       target: "+fail_context(text,r),CYA))
            fail+=1
    # overlap check + splice from end
    edits.sort()
    for i in range(1,len(edits)):
        if edits[i][0]<edits[i-1][1]:
            print(col("[warn] overlapping edits %d/%d - skipping later"%(i-1,i),YEL))
    outtext=text
    for s,e,seg in sorted(edits,key=lambda x:-x[0]):
        outtext=outtext[:s]+seg+outtext[e:]
    # ---- JSON content auto-scan ----
    if args.json:
        c=extract_content(args.json)
        glob="window.__DG_CONTENT="+json.dumps({k:v for k,v in c.items() if not k.startswith("_")},ensure_ascii=False)+";"
        outtext=glob+NL+outtext
        print()
        print(col("[content] ",CYA)+"injected window.__DG_CONTENT  mons=%d items=%d skins=%d emotes=%d (mapNodes=%d)"%(
            len(c["mons"]),len(c["items"]),len(c["skins"]),len(c["emotes"]),c["_nodes"]))
        print(col("          menu can read these live so new content auto-appears.",DIM))
    if os.path.abspath(args.out)==os.path.abspath(args.original):
        args.out="dynamons_world_modded.min.js"
        print(col("[safety] refusing to overwrite the original; writing to "+args.out,YEL))
    outtext=maybe_inject_debug(outtext)
    outtext=inject_mod_menu(outtext)
    with open(args.out,"w",encoding="utf-8") as _f:
        _f.write(outtext)
    print(col("[write] new file created: "+os.path.abspath(args.out)+" ("+str(len(outtext))+" chars)",GREEN))
    print(col("[write] original "+os.path.basename(args.original)+" left untouched.",DIM))
    print()
    print(col(BOLD+"=== SUMMARY ==="+RST,BOLD))
    print("  applied: "+col(str(ok),GREEN)+"   failed: "+col(str(fail),RED if fail else DIM)+"   out: "+args.out+" (%d chars)"%len(outtext))
    if fail:
        print(col("  -> some mods did NOT match this version. Re-run 'derive' on the new",YEL))
        print(col("     original+patch, or fix the flagged rules above.",YEL))
        return 2
    print(col("  All mods applied cleanly.",GREEN))
    return 0

# ============================ VERIFY (round-trip) ============================
def verify(args):
    text=open(args.original,encoding="utf-8",errors="replace").read()
    man=json.load(open(args.rules,encoding="utf-8")); rules=man["rules"]
    edits=[]
    for r in rules:
        status,info,note=locate(text,r)
        if status!="ok":
            print(col("FAIL #%d %s: %s"%(r["id"],r["feature"],info),RED)); return 2
        m=info; edits.append((m.start(),m.end(),apply_segs(m,r["repl_segs"])))
    out=text
    for s,e,seg in sorted(edits,key=lambda x:-x[0]): out=out[:s]+seg+out[e:]
    exp=open(args.expect,encoding="utf-8",errors="replace").read()
    same=(out==exp)
    print(col("ROUND-TRIP: OUTPUT == patch  -> "+str(same),GREEN if same else RED))
    if not same:
        print("  out=%d expect=%d"%(len(out),len(exp)))
        for k in range(min(len(out),len(exp))):
            if out[k]!=exp[k]:
                print("  first diff @%d: out=%r exp=%r"%(k,out[k:k+40],exp[k:k+40])); break
    return 0 if same else 3

def main():
    global NOCOLOR
    ap=argparse.ArgumentParser(prog="patch_dynamons.py",description="Re-applyable Dynamons World mod patcher")
    ap.add_argument("--no-color",action="store_true")
    sub=ap.add_subparsers(dest="mode",required=True)
    d=sub.add_parser("derive",help="learn rules from original+patch -> patches.json")
    d.add_argument("--original",required=True); d.add_argument("--patch",required=True)
    d.add_argument("--out",default="patches.json")
    p=sub.add_parser("apply",help="apply patches.json to dynamons_world.min.js")
    p.add_argument("--original",default="dynamons_world.min.js")
    p.add_argument("--rules",default="patches.json")
    p.add_argument("--json",default=None,help="decoded game json for content auto-scan")
    p.add_argument("--out",default="dynamons_world_modded.min.js")
    v=sub.add_parser("verify",help="round-trip: apply rules to original, compare to expect")
    v.add_argument("--original",required=True); v.add_argument("--rules",default="patches.json")
    v.add_argument("--expect",required=True)
    args=ap.parse_args()
    NOCOLOR=args.no_color
    try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
    try: sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass
    try: os.system("")
    except: pass
    if args.mode=="derive": sys.exit(derive(args))
    if args.mode=="apply":  sys.exit(apply(args))
    if args.mode=="verify": sys.exit(verify(args))

if __name__=="__main__":
    main()