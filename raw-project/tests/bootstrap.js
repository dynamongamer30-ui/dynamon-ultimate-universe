window.__DG_INSTALL_NATIVE=function(){if(window.__DG_NATIVE)return;var r=window.$DW||window.$hxClasses;if(!r||!r['co.doubleduck.dynamons3.meta.GameState'])return;if(!window.__DG_API){
/* ════════════ DYNAMON GAMER MOD v7.0 (premium · brand orange/gold · remote locks · center toasts) ════════════ */
/* ===================================================================
 * DYNAMONS WORLD - MOD MENU v6.4  (premium build by Sai)
 * Requires registry patch: var t=(window||self).$DW={}
 * Real classes: meta.GameState, data.GameplayDB, core.Mon, core.Battle, core.Ability
 * =================================================================== */
(function () {
  "use strict";
  if (window.__DW_MOD_V5) return; window.__DW_MOD_V5 = true;
  var DW_LOGO="";
  var DW_BRAND="Dynamon Gamer";
  var DW_SOCIAL=[
    ["<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='6' width='20' height='12' rx='4'/><polygon points='10 9 16 12 10 15' fill='currentColor' stroke='none'/></svg>","YouTube","https://youtube.com/@DynamonGamer"],
    ["<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M22 2 11 13'/><path d='M22 2 15 22l-4-9-9-4Z'/></svg>","Telegram","https://t.me/DynamonGamer"],
    ["<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5Z'/><path d='M8.5 9.5c0 4 2 6 6 6'/></svg>","WhatsApp","https://whatsapp.com/channel/DynamonGamer"],
    ["<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='2' width='20' height='20' rx='5'/><circle cx='12' cy='12' r='4'/><circle cx='17.5' cy='6.5' r='1' fill='currentColor' stroke='none'/></svg>","Instagram","https://instagram.com/DynamonGamer"],
    ["<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M3 12h18'/><path d='M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18'/></svg>","Website","https://dynamongamer.com"]
  ];
  var DW_CSS = "";

  /* ---------------- registry + class handles ---------------- */
  function REG(){ return window.$DW || window.$hxClasses || null; }
  function K(n){ var r=REG(); return r? r[n]:null; }
  var CN={GS:"co.doubleduck.dynamons3.meta.GameState",DB:"co.doubleduck.dynamons3.data.GameplayDB",Mon:"co.doubleduck.dynamons3.core.Mon",Battle:"co.doubleduck.dynamons3.core.Battle",Ability:"co.doubleduck.dynamons3.core.Ability"};
  function GS(){return K(CN.GS);} function DB(){return K(CN.DB);}
  function MonC(){return K(CN.Mon);} function BattleC(){return K(CN.Battle);} function AbilityC(){return K(CN.Ability);}

  /* ---------------- logging ---------------- */
  var LOG=[];
  function log(m){ m="["+new Date().toLocaleTimeString()+"] "+m; LOG.push(m); if(LOG.length>250)LOG.shift();
    try{console.log("DWMOD",m);}catch(e){} var el=document.getElementById("dw_log");  }
  function call(o,m,a,l){ try{ if(o&&typeof o[m]==="function") return o[m].apply(o,a||[]); log("MISS "+(l||m)); }catch(e){ log("ERR "+(l||m)+": "+e); } }

  /* ---------------- haptics + sound ---------------- */
  function __dgReducedMotion(){ try{return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}catch(e){return false;} }
  function buzz(){}
  var AC=null; function actx(){ try{ if(!AC) AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} return AC; }
  function beep(){}
  function sClick(){ beep(620,0.05,"triangle",0.04); buzz(10); }
  function sOn(){ beep(880,0.09,"sine",0.05); beep(1320,0.06,"sine",0.04); buzz(18); }
  function sOff(){ beep(420,0.09,"sine",0.05); buzz(14); }
  function sOk(){ beep(720,0.07,"triangle",0.05); setTimeout(function(){beep(1080,0.09,"triangle",0.05);},70); buzz([10,30,10],"essential"); }
  function sLock(){ try{ beep(440,0.07,"sawtooth",0.05); setTimeout(function(){beep(300,0.10,"sawtooth",0.05);},85); setTimeout(function(){beep(200,0.13,"sawtooth",0.045);},180); buzz([18,40,18],"essential"); }catch(e){} }

  /* ---------------- toast ---------------- */
  function toast(msg,kind){ window.__DG_LAST_NOTICE={message:String(msg),kind:kind||"ok",at:Date.now()}; }

  /* ===================== GAME SPEED ===================== */
  function __dgReadSpeed(){ try{ var n=parseFloat(localStorage.getItem("__DG_SPEED")); return isFinite(n)&&n>=0.1&&n<=8?Math.round(n*10)/10:1; }catch(e){return 1;} }
  function __dgSpeed(){ try{ window.$DG=window.$DG||{}; var n=+window.$DG.speed; if(!isFinite(n)||n<0.1||n>8)n=__dgReadSpeed(); window.$DG.speed=Math.round(n*10)/10; return window.$DG.speed; }catch(e){return 1;} }
  function __dgSetSpeed(value,out,announce){ var n=parseFloat(value); if(!isFinite(n))n=1; n=Math.max(0.1,Math.min(8,Math.round(n*10)/10)); try{ window.$DG=window.$DG||{}; window.$DG.speed=n; if(window.$DG.applySpeed)window.$DG.applySpeed(); localStorage.setItem("__DG_SPEED",n.toFixed(1)); }catch(e){} if(out)out.textContent=n.toFixed(1)+"×"; if(announce){try{toast("Speed "+n.toFixed(1)+"×","ok");buzz(8);}catch(e){}} }
  try{window.$DG=window.$DG||{};window.$DG.speed=__dgSpeed();}catch(e){}

  /* ===================== FEATURE STATE ===================== */
  var F={ autoGrind:false, autoWorld:false, god:false, oneHit:false, crit:false, statusImmune:false, noCD:false, alwaysCatch:false, botMatch:false, winToss:false, winTrophy:false, noTrophyLoss:false, statcap:false, maxdef:false, fullheal:false, pvpcd:false, itemtimer:false, turnreset:false, items5:false, nicklen:false, nickval:false, shopfix:true, saveSettings:true, haptics:true };
  var __DG_SETTINGS_KEY="__DG_F_v2", __DG_SETTINGS_VERSION=2;
  function __dgReadSettings(){ try{ var raw=localStorage.getItem(__DG_SETTINGS_KEY)||localStorage.getItem("__DG_F"); if(!raw)return; var parsed=JSON.parse(raw), values=parsed&&parsed.values?parsed.values:parsed; if(!values||typeof values!=="object")throw new Error("settings"); for(var k in values){ if(k!=="autoGrind"&&k!=="autoWorld"&&Object.prototype.hasOwnProperty.call(F,k)&&typeof values[k]==="boolean")F[k]=values[k]; } }catch(e){ try{localStorage.removeItem(__DG_SETTINGS_KEY);}catch(_e){} } }
  __dgReadSettings();
  window.__DGF=window.__DGF||{}; function __dgSyncDGF(){ F.shopfix=true; try{ var ks=["statcap","maxdef","fullheal","pvpcd","itemtimer","turnreset","items5","nicklen","nickval","shopfix"]; for(var i=0;i<ks.length;i++) window.__DGF[ks[i]]=!!F[ks[i]]; }catch(e){} } __dgSyncDGF();
  function __dgSaveF(){ if(!F.saveSettings)return; try{ var values={}; for(var k in F){ if(k!=="autoGrind"&&k!=="autoWorld"&&k!=="saveSettings")values[k]=!!F[k]; } localStorage.setItem(__DG_SETTINGS_KEY,JSON.stringify({version:__DG_SETTINGS_VERSION,values:values})); }catch(e){} }
  function __dgResetF(){ try{localStorage.removeItem(__DG_SETTINGS_KEY);localStorage.removeItem("__DG_F");}catch(e){} for(var k in F){ if(typeof F[k]==="boolean")F[k]=(k==="saveSettings"||k==="haptics"); } __dgSyncDGF(); try{__dgApplyLocks();}catch(e){} }

  /* ===================== CURRENCY ===================== */
  function getCoins(){ var g=GS(); return g? (call(g,"getPlayerCoins",[],"coins")||0):0; }
  function getDust(){ var g=GS(); return g? (call(g,"getPlayerDust",[],"dust")||0):0; }
  function setCoins(v){ var g=GS(); if(!g)return toast("Game not ready","err"); call(g,"setPlayerCoins",[v|0]); toast("Coins -> "+fmt(v)); sOk(); refreshCur(); }
  function setDust(v){ var g=GS(); if(!g)return toast("Game not ready","err"); call(g,"setPlayerDust",[v|0]); toast("Dust -> "+fmt(v)); sOk(); refreshCur(); }
  function killCheat(){ installStealth(); }
  function installStealth(){ if(installStealth._done) return; var n=0;
    /* 1) GameState name/coins anti-cheat (silent rename to Ilovecoins/Ilovewinter) */
    try{ var g=GS(); if(g){ if(typeof g.checkCheater==="function"){ g.checkCheater=function(){}; n++; } var gp=g.constructor&&g.constructor.prototype; if(gp&&typeof gp.checkCheater==="function"){ gp.checkCheater=function(){}; n++; } } }catch(e){}
    /* 2) MPValidator — kills "Cheaters are not allowed, update from store" + version/maintenance popups */
    try{ var Ra=K("co.doubleduck.dynamons3.multiplayer.MPValidator"); if(Ra && typeof Ra.validateData==="function" && !Ra.__dwVD){
      /* Force the version/maintenance gate to PASS without breaking SUCCESS dispatch. Fixes "Verifying connection" hang AND suppresses the maintenance/"update from store" popup. validate()/handleVersionData run normally; we only force the final decision. */
      var oVD=Ra.validateData; Ra.validateData=function(){ try{ Ra._maintenanceData="false"; }catch(e){} try{ return oVD.apply(this,arguments); }catch(e){ return; } }; Ra.__dwVD=true; n++;
    } }catch(e){}
    /* 3) In-battle cheat report + popup (_mpError) */
    try{ var B=BattleC(); var bp=B&&B.prototype; if(bp){ if(typeof bp.reportUnfair==="function"){ bp.reportUnfair=function(){}; n++; } if(typeof bp.handleCheatError==="function"){ bp.handleCheatError=function(){}; n++; } if(typeof bp.displayMPErrors==="function"){ var od=bp.displayMPErrors; bp.displayMPErrors=function(){ try{ if(this&&this._mpError){ this._mpError=0; return; } }catch(e){} try{ return od.apply(this,arguments); }catch(e){} }; n++; } } }catch(e){}
    installStealth._done=true; log("Stealth installed — "+n+" cheater check(s)/popup(s) neutralised"); }
  function showRestart(msg){ try{ var ov=mk("div",{id:"dw_restart"});
    var card=mk("div",{class:"dw_rcard"});
    card.appendChild(mk("div",{class:"dw_rtitle",html:"<span class=dw_ricon>"+"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12a9 9 0 0 1 15-6.7L21 8'/><path d='M21 3v5h-5'/><path d='M21 12a9 9 0 0 1-15 6.7L3 16'/><path d='M3 21v-5h5'/></svg>"+"</span>Restart Required"}));
    card.appendChild(mk("div",{class:"dw_rmsg",text:msg}));
    var row=mk("div",{class:"dw_rrow"});
    var yes=mk("div",{class:"dw_rbtn yes",text:"Restart Now"}); yes.onclick=function(){ try{ location.reload(); }catch(e){ try{ window.location.href=window.location.href; }catch(_){} } };
    var no=mk("div",{class:"dw_rbtn no",text:"Later"}); no.onclick=function(){ ov.remove(); };
    row.appendChild(yes); row.appendChild(no); card.appendChild(row); ov.appendChild(card); document.body.appendChild(ov);
  }catch(e){ log("restart prompt err "+e); } }
  function installPvP(){ /* flags enforced live in keep-alive loop */ var on=F.botMatch||F.winToss||F.winTrophy||F.noTrophyLoss; log("PvP cheats "+(on?"armed":"disarmed")); }
  function __dgRealPvP(cb){
    if(!cb || !cb._mpData)return false;
    if(typeof cb.__dgRealArena!=='boolean')cb.__dgRealArena=cb._mpData.botBattle!==true;
    return cb.__dgRealArena;
  }
  window.__DG_isRealArena=function(battle){return __dgRealPvP(battle||window.__curBattle);};
  window.__DG_matchActive=function(){var b=window.__curBattle;return !!(b && !b._battleOver && !b._hasEscaped && (!("parent" in b)||b.parent!=null));};
  function enforcePvP(cb){ try{ if(!cb)return; var isMP=(cb._mpData!=null)||(cb._botBattle===true); if(!isMP)return;
    if(F.winToss&&!__dgRealPvP(cb)){ try{ cb._mpIsFirst=true; }catch(e){} }
    // Bot routing belongs to matchmaking. Never convert an active real match.
    // Results are handled once by showMPWinner, not overwritten every polling tick.
  }catch(e){} }
  /* 4) Catch the client-side validator off battle instances (validateEnemyTeam/Input, writeCheat) */
  function neuterValidator(b){ try{ var cv=b&&b._clientValidator; if(cv&&!cv.__dwNeut){ var p=cv.constructor&&cv.constructor.prototype; if(p){ if(typeof p.validateEnemyTeam==="function") p.validateEnemyTeam=function(){return true;}; if(typeof p.validateEnemyInput==="function") p.validateEnemyInput=function(){return true;}; if(typeof p.writeCheat==="function") p.writeCheat=function(){}; } cv.__dwNeut=true; log("client validator neutralised"); } }catch(e){} }
  function fmt(n){ try{return Number(n).toLocaleString();}catch(e){return n;} }

  /* ===================== ITEMS (consumables only) ===================== */
  function suitIds(){ var d=DB(); var s=d?call(d,"getAllSuits",[],"suits"):null; var set={}; if(Array.isArray(s))s.forEach(function(x){var id=x&&(x.id||x); if(id)set[id]=1;}); return set; }
  /* ===================== v6 HELPERS ===================== */
  function DK(name){ try{ var d=K("co.doubleduck.dynamons3.data.DataKey"); if(d&&d[name]!=null) return d[name]; }catch(e){} return name; }
  function gget(key){ var g=GS(); if(!g)return ""; try{ var v=g.getString(DK(key)); return v==null?"":v; }catch(e){ try{ var v2=g.getString(key); return v2==null?"":v2; }catch(_){ return ""; } } }
  function gset(key,val){ var g=GS(); if(!g)return false; try{ g.setString(DK(key),val); return true; }catch(e){ try{ g.setString(key,val); return true; }catch(_){ return false; } } }
  function parseItemsStr(str){ var m={}; (str||"").split(";").forEach(function(e){ if(!e)return; var c=e.lastIndexOf(","); if(c<0){m[e]="1";return;} m[e.slice(0,c)]=e.slice(c+1); }); return m; }
  function itemsToStr(m){ var a=[]; for(var k in m){ if(k) a.push(k+","+m[k]); } return a.join(";")+(a.length?";":""); }
  function partyMons(){ try{ var gs=GS(); if(gs&&gs.getParty){ var p=gs.getParty(); if(p&&p.length) return p.slice(); } }catch(e){} return []; }
  function isMine(m){ try{ var cb=window.__curBattle; if(cb&&m===cb._selfMon) return true; var p=partyMons(); if(p.indexOf&&p.indexOf(m)!==-1) return true; }catch(e){} return false; }
  function dwIconCSS(){ try{ if(document.getElementById("dw_icon_css"))return; var st=document.createElement("style"); st.id="dw_icon_css"; st.textContent=".dw_item{display:flex;align-items:center;} .dw_icon{width:34px;height:34px;object-fit:contain;margin-right:10px;flex:0 0 auto;border-radius:6px;background:rgba(255,255,255,.04);}"; document.head.appendChild(st); }catch(e){} }
  var EMBED_AVATARS=["zak","stephan","sofia","shelldon","remi","nora","jenni","chuk","alaska","blaze","boris","boris_reaper","klaude_dracula","bradley","cable","christos","dario","dark_elite_guard","dom","earth_elite_guard","explorer","fire_elite_guard","fredrik","guard","jeff","julian","klaude","kolin","manifesto","martha","maxwell","mercenary","patrik","raider","violet","water_elite_guard","woody","ruby","shellbist","frankenstein","fire_elite_devil","water_elite_pirate","halloween","dracula_zombie","zombie_guard","chuk_zombie","cable_zombie","ferguson_with_glasses","electric_elite_guard_cable","mysterious_man","electric_elite_guard","water_elite_zombie","dark_elite_corcerer","diamond_elite_guard","scientist","santa","mei_lian","chinese_knight","kai","fang","sumsum","chef_bernardo","golden_elite_armor","inferno","spirit_suit","ice_suit","diamond_suit","gate_keeper","frankenstain","reaper","diamond_elite","guard_christmas","zenix","gold_dragon","mister_pumpkin","wereboar","earth_elite_frankenstein","zombie_horde","guard_under_spell","boris_under_spell","fredrik_under_spell","klaude_under_spell","gate_keeper_human","king_baltor","guard_chief","water_elite_young"];
  var EMBED_SKINS=["tydonyx_skin","anubolt_skin","aragonyx_skin","dagaryx_skin","sauryx_skin","horzaryx_skin","tholanyx_skin","zonysus_skin","lionydys_skin","skulldonyx_skin","fenixaro_skin","crocynos_skin","goldonyx_skulldonyx_skin","goldonyx_snowdonyx_skin","tydonyx_sorcerer_skin","zonysus_dracula_skin","aragonyx_pirate_skin","sauryx_frankenstein_skin","knightanyx_angry","rhinodys_dead","tholanyx_halloween","zonysus_halloween","eraseon_chinese","visi_dead","fenixaro_snow","volcarnyx_ultra","horzaryx_halloween","aragonyx_halloween","zonysus_snow","lionydys_halloween","spirit_dragon_awakened","crocynos_halloween","guardian_skull_king","uryndur_dead","dagaryx_halloween","sharkonyx_halloween","crocynos_snow","sauryx_halloween","fenixaro_dead","tydonyx_snow","anubolt_halloween","goldonyx_halloween","tydonyx_halloween","horzaryx_dead","kytydox_neon","scarykin_halloween","goldonyx_snow","bearmoryx_halloween"];
  var EMBED_EMOTES=["emote#breathe","emote#burn","emote#chips","emote#dodge","emote#waiting","emote#dragon_dislike","emote#dragon_laugh","emote#santa_laugh","emote#santa_adorable","emote#santa_heart_eyes","emote#santa_angry","emote#santa_king","emote#eyes_on_you","emote#flip","emote#hello","emote#victory","emote#loser","emote#mocking","emote#no","emote#wow","emote#perfect","emote#power","emote#rage","emote#relax","emote#silly","emote#superhero","emote#devil","emote#angry_halloween","emote#devil_halloween","emote#fear_halloween","emote#glasses_halloween","emote#heart_eyes_halloween","emote#king_halloween","emote#laugh_halloween","emote#sleeping_halloween","emote#steam_halloween","emote#monocle","emote#scared","emote#boxing","emote#trophy","emote#proud","emote#sleep","emote#dragon_smirking","emote#tongue_halloween","emote#handshake","emote#slime","emote#freezing","emote#adorable","emote#facepalm","emote#hot_head","emote#two_fists","emote#yawn","emote#rock","emote#dislike","emote#hug","emote#injured","emote#laugh_tears","emote#smirking","emote#smirking_glasses","emote#flushed","emote#tongue_side","emote#tongue","emote#dynamons_king","emote#tongue_christmas","emote#hand_over_mouth","emote#glasses","emote#upside_down","emote#thinking","emote#sweat","emote#peeking_eye","emote#steam","emote#fear","emote#biceps","emote#folded_hands","emote#star_eyes","emote#partying","emote#heart_eyes","emote#halo","emote#exploding-head","emote#sleeping","emote#spyral_eyes","emote#smiling","emote#relivied","emote#unamused"];

  function monIds(){ var d=DB(); var s=d?call(d,"getAllMons",[],"mons"):null; var set={}; if(Array.isArray(s))s.forEach(function(x){var id=x&&(x.id||x); if(id)set[id]=1;}); return set; }
  var IAP_RX=/(pack|_egg|no_ads|unlock_all_worlds|golden_dynamons|golden_dinosaurs|all_dynamons|ultimate|_offer|_deal|emoticons|_dead|battle_speed|auto_heal|4x_xp|5_dragon|diamond_egg)/i;
  var SKIN_RX=/(_skin$|_halloween$|_snow$|_ultra$|_angry$|_neon$|_awakened$|_chinese$|_christmas$)/i;
  function consumables(){ var d=DB(); var all=d?call(d,"getAllItems",[],"items"):null; if(!Array.isArray(all))return [];
    var sk=suitIds(), mn=monIds();
    return all.filter(function(it){ var id=it&&it.id; if(!id)return false;
      if(/^mon#/.test(id)||/^emote#/.test(id)||/^video_counter#/.test(id))return false;
      if(id==="level_up_snack_12"||id==="unlimited_snacks"||id==="candy_cane_2")return false; if(id==="ice_suit"||id==="diamond_suit"||id==="inferno"||id==="inferno_armor"||id==="suit#inferno")return true; if(sk[id]||mn[id])return false; if(SKIN_RX.test(id)||IAP_RX.test(id))return false; return true; }); }
  function itemAmt(id){ var g=GS(); return g? (call(g,"getItemAmount",[id])||0):0; }
  function setItem(id,n){ var g=GS(); if(!g)return; call(g,"setItemAmount",[id,n|0]); }

  /* ===================== UNLOCK ===================== */
  function unlockWorld(){ var g=GS(),d=DB(); if(!g||!d)return toast("Not ready","err");
    var nodes=call(d,"getMapNodes",[],"nodes")||call(d,"getAllMapNodes",[],"nodes2")||[];
    var beaten=[],completed=[],mapsSet={},packsSet={};
    nodes.forEach(function(nd){ if(!nd)return; if(nd.id!=null)beaten.push(""+nd.id);
      if(nd.map)mapsSet[nd.map]=1; if(nd.pack)packsSet[nd.pack]=1;
      var cid=nd.bossBattle&&nd.bossBattle.completionID; if(cid)completed.push(cid); });
    if(g.setNodeBeated){ beaten.forEach(function(id){ try{g.setNodeBeated(id,true);}catch(e){} }); }
    if(g._nodesBeated){ var ns={}; g._nodesBeated.forEach(function(x){ns[String(x)]=1;}); beaten.forEach(function(id){ if(!ns[id]){g._nodesBeated.push(id);ns[id]=1;} }); } else { g._nodesBeated=beaten.slice(); }
    gset("NODES_BEATED", g._nodesBeated.join(","));
    var maps=Object.keys(mapsSet), packs=Object.keys(packsSet);
    gget("MAPS_UNLOCKED").split(",").forEach(function(mm){ if(mm&&maps.indexOf(mm)===-1)maps.push(mm); });
    gget("MAP_PACKS_UNLOCKED").split(",").forEach(function(pp){ if(pp&&packs.indexOf(pp)===-1)packs.push(pp); });
    if(g.setMapUnlocked){ maps.forEach(function(mm){ try{g.setMapUnlocked(mm,true);}catch(e){} }); }
    gset("COMPLETED_IDS", completed.join(","));
    gset("MAPS_UNLOCKED", maps.join(","));
    gset("MAP_PACKS_UNLOCKED", packs.join(","));
    gset("MAPS_REWARD_CLAIMED", maps.join(","));
    sOk(); log("world nodes="+beaten.length+" completed="+completed.length+" maps="+maps.length+" packs="+packs.length);
    toast("Saved "+beaten.length+" nodes \u2014 restart to load","ok");
    showRestart("All "+beaten.length+" map nodes were written to your save. The game must RESTART to load 1500+ nodes into memory."); }
  
  function tryAny(g,fns,args){ return fns.some(function(fn){ if(typeof g[fn]==="function"){ try{g[fn].apply(g,args); return true;}catch(e){} } return false; }); }
  /* ===== v6.1 IN-MEMORY WRITE HELPERS (root-cause fix) ===== */
  function ITM(){ var g=GS(); if(!g)return null; try{ if(!g._playerItems)return null; if(!g._playerItems.h)g._playerItems.h={}; return g._playerItems.h; }catch(e){return null;} }
  function MItem(id,c){ var m=ITM(); if(!m)return false; m[id]=(c==null?1:c); return true; }
  function MSave(){ var g=GS(); try{ if(g&&g.saveItems)g.saveItems(); }catch(e){log("saveItems "+e);} }
  function MCap(ids){ var g=GS(); if(!g)return 0; try{ if(!g._capturedMons)g._capturedMons=[]; var set={}; g._capturedMons.forEach(function(x){set[String(x)]=1;}); var n=0; ids.forEach(function(id){ id=""+id; if(!set[id]){g._capturedMons.push(id);set[id]=1;n++;} }); try{gset("CAPTURED_MONS",g._capturedMons.join(";"));}catch(e){} return n; }catch(e){log("MCap "+e);return 0;} }
  function installCatchHook(){ try{ var BT=K(CN.Battle); if(BT&&BT.prototype&&!BT.prototype.__dwCatch){ var _o=BT.prototype.tryCatch; if(typeof _o==="function"){ BT.prototype.tryCatch=function(a,b){ try{ if(F.alwaysCatch) b=true; }catch(e){} return _o.call(this,a,b); }; BT.prototype.__dwCatch=true; log("always-catch hook installed"); } } }catch(e){ log("catch hook "+e); } }
  function unlockMons(){ var g=GS(),d=DB(); if(!g||!d)return toast("Not ready","err");
    var L=call(d,"getAllMons",[],"mons")||[]; var ids=[];
    L.forEach(function(m){var id=m&&(m.id!=null?m.id:m); if(id!=null)ids.push(""+id);});
    try{ var __ext=["squllyx","armadigo","armadrillo","ardrillox","falcano","falcanic","falcongfu","flarion","flameon","flameonyx","hopchop","baniblaze","lapinaf","hopchop_snow","baniblaze_snow","lapinaf_snow","kitnex","sparkune","sparkunycus","lavapede","lapre","lavalanto","menza","pangrill","fierodor","menza_snow","pangrill_snow","fierodor_snow","pyropine","spyropine","fyropine","rexaroo","riptor","pyrosaur","fire_egg","baby_krimson","krimson","auburn","volcarnyx","robocanyx","flamboar","boarbaque","haboar","torchip","scorchite","scarnyx","lionydys","eelonyx","yetyxar","topaz_jerbo","jerboozle","jaerboaz","aviatos","fligoss","flianys","grubble","dynabug","dyxarix","gryphon","gryphoenix","gryphynos","jeempy","jempking","jeeforz","leafrog","vertoad","toadaryx","nintoise","turtylo","znarlyx","pumpking","pumpress","pumpernox","quacko","platypad","platagon","tacofox","elvee","elveelyx","tuffnut","jubipod","tufaryx","evren","crocynos","thornder","bodin","tauruzyx","malakite_egg","baby_malakite","malakite","sardonyx","sauryx","dreq","dreqador","dreqorus","bearmoryx","embera","embaryx","moltalor","moltalox","moltanyx","tuffire","jubifero","jubiferyx","flowingo","gomingo","flowmigona","kikflick","dropkola","dropkolyx","grubble_snow","dynaski","naxarix","duckron","aquadux","duxnite","hydron","tentapod","hydroza","lampion","surfant","hydragon","pengu","nootnoot","empengon","podapod","podness","podadion","shellby","gemish","crabodox","tailton","maankey","maangoryx","vulfrost","vullard","vullardon","winger","wingrizzle","wingronox","kobalt_egg","baby_kobalt","kobalt","aragonite","aragonyx","sluglug","slail","slailoxa","snorky","snorkoth","hydraphant","glixie","glixeidon","glixonyx","tazer","boltage","blitzle","humzee","humbrine","humbroxa","jojolt","bobolt","boltobyx","beebot","cybuzz","cybeenyx","blitz","blitztrix","blitzyran","buzelle","blitzeer","thundeer","amuranther","spidread","aracnoyd","aracatyx","shadowl","torney","mystrix","una","unexus","unarodin","vampix","vampixard","vampyzor","psython","psyking","infinissy","foxcarf","forune","foxunyx","zenix_egg","baby_zenix","zenix","zydonyx","zonysus","monbaa","barama","ramboom","pandinky","pandora","pandeidon","snig","sneg","snegoryx","fengo","huango","huanyx","lavokry","lavokrux","devish","wereboar","hellboar","spooky","spookasaur","ghumble","shockadile","voltork","volteonyx","cappato","cappatoise","cappatoryx","dark_egg_2","baby_dark_2","ramethyst","apatite","dagaryx","zomok","xomox","zomonyx","hermes","hermatude","hermalith","kelpish","kelpie","kelpynar","orqua","gigawhopp","orquanys","soaky_popo","octopo","ocquadia","zapsnap","buzzsnap","bozzodox","kanga","kangaboom","kangakyk","jolty_popo","octojolt","ocjolton","electric_egg","baby_electric","kitine","peridox","kytydox","scarykin","boarcupino","boarcuzyx","boarcudon","scarabyx","barabyx","scarbydox","horzaryx","draxygus","visi","darkdragonegg","eraxad","eraxado","erasodys","eraseon","tuffdar","jubidaro","jubidarox","darkunera","darkunaryx","anubolt","soruween","tholanyx","jaxaguar","tuffelc","jubivolt","jubivoltyx","evoltonera","evoltonaryx","tortunk","spikeolyx","earthadera","eartharyx","aqonera","aqonaryx","sharkonyx","tuffwata","jubidrip","jubinyx","diamonddragonegg","tyxad","tyxado","tyxadys","tydonyx","surfant_diamond","hydragon_diamond","dropkola_diamond","dropkolyx_diamond","monbaa_diamond","barama_diamond","ramboom_diamond","rabbityx","rhinodys","daimonera","daimoryx","elydjin","purrdahlia","purrchili","purrshocka","purrlemoon","purrsnubble","purrblingy","purrwhispa","purrbuff","pitbollux","golddragonegg","goldaby","goxabyx","goxydys","goldonyx","fenixaro","tyrexar","tyceratox","pterodanox","knightanyx","cobragora","golunera","golunaryx","bunauro","tuffspira","jubispira","jubispirax","wolfkahu","anglobine","skyvioru","uryndur","chyroax","scorvenox","axolotix","sihorico","yacatoma","ghonsera","ghonsaryx","hyanite","spynorox","owlflake","froskryx","gingyron","guardian_king","spirit_dragon","geckonys","sybertyga","werefroz","devil","chamulon","featheruna","hippone","sealed_door","sealed_door2","sealed_door3","sealed_door4","sealed_door5"]; for(var __i=0;__i<__ext.length;__i++){ if(ids.indexOf(__ext[__i])<0) ids.push(__ext[__i]); } }catch(e){}
    var n=MCap(ids);
    try{["guardian_king_bone","revival_spell","golden_cup","ancient_cup_with_water","spirit_sacred_crystal","diamond_sacred_crystal","dragon_sacred_crystal","devil_sacred_crystal","spirit_dragon_crystal"].forEach(function(it){try{setItem(it,99);}catch(e){} try{MItem(it,99);}catch(e){}});}catch(e){}
    sOk(); toast("Dynamons: "+ids.length+" (+"+n+" new)"); log("mons captured total="+((g._capturedMons&&g._capturedMons.length)||"?")+" added="+n); }
  
  function unlockSkins(){ var g=GS(),d=DB(); if(!g)return toast("Not ready","err");
    var skins=EMBED_SKINS.slice();
    var L=d?call(d,"getAllItems",[],"items"):null; if(Array.isArray(L))L.forEach(function(it){ var id=it&&it.id; if(id&&/skin/i.test(id)){ var b=String(id).replace(/^skin#/,""); if(skins.indexOf(b)===-1)skins.push(b); } });
    var ok=0; skins.forEach(function(b){ b=String(b).replace(/^skin#/,""); if(MItem("skin#"+b,1))ok++; MItem(b,1); });
    MSave(); sOk(); toast("Skins +"+ok); log("skins mem "+ok); }
  function unlockEmotes(){ var g=GS(),d=DB(); if(!g)return toast("Not ready","err");
    var em=EMBED_EMOTES.slice();
    var L=d?call(d,"getAllItems",[],"items"):null; if(Array.isArray(L))L.forEach(function(it){ var id=it&&it.id; if(id&&/^emote#/.test(id)&&em.indexOf(id)===-1)em.push(id); });
    var ok=0; em.forEach(function(id){ id=String(id); if(!/^emote#/.test(id))id="emote#"+id; if(MItem(id,1))ok++; });
    MSave(); sOk(); toast("Emojis +"+ok); log("emotes mem "+ok); }
  function unlockEverything(){ try{unlockMons();}catch(e){} try{unlockSkins();}catch(e){} try{unlockEmotes();}catch(e){} try{unlockAvatars();}catch(e){}  try{unlockIAP();}catch(e){} try{MSave&&MSave();}catch(e){} toast("Unlocked everything \u2014 restarting\u2026"); log("unlock-everything done; auto-restart"); setTimeout(function(){ try{location.reload();}catch(e){} },600); }
  
  function unlockAvatars(){ var g=GS(); if(!g)return toast("Not ready","err");
    var list=(typeof EMBED_AVATARS!=="undefined")?EMBED_AVATARS:[]; var ok=0;
    if(g.addAvatarBought){ list.forEach(function(a){ if(!a)return; try{ if(g.isAvatarBought&&g.isAvatarBought(a))return; g.addAvatarBought(a); ok++; }catch(e){log("av "+e);} }); }
    else { var cur=gget("AVATARS_BOUGHT").split(",").filter(Boolean); var set={}; cur.forEach(function(a){set[a]=1;}); list.forEach(function(a){ if(a&&!set[a]){set[a]=1;ok++;} }); gset("AVATARS_BOUGHT",Object.keys(set).join(",")); }
    sOk(); toast("Avatars +"+ok); log("avatars mem "+ok); }
  
  function unlockIAP(){ var g=GS(),d=DB(); if(!g)return; var ok=0; var ids=["no_ads","all_dynamons","golden_dynamons","unlock_all_worlds","ultimate_pack","starterpack","christmas_pack","halloween_pack","legendary_pack","diamond_egg_pack"];
    ids.forEach(function(id){ if(tryAny(g,["setBoughtIap","addBoughtIap","setIapBought","unlockIap"],[id,true]))ok++; try{if(g.setItemAmount)g.setItemAmount(id,1);}catch(e){} });
    toast("IAP attempted "+ok); sOk(); log("IAP attempted "+ok+" (paste this if 0)"); }

  /* ===================== BATTLE HOOKS ===================== */
  var __DG_HOOK_STATUS=window.__DG_HOOK_STATUS||{};
  function __dgWrapMethod(proto,key,make){ try{ if(!proto||typeof proto[key]!=="function")return false; var orig=proto[key]; if(orig.__dgWrapped)return true; var wrapped=make(orig); try{Object.defineProperty(wrapped,"__dgWrapped",{value:true});Object.defineProperty(wrapped,"__dgOriginal",{value:orig});}catch(e){} proto[key]=wrapped; return true; }catch(e){ return false; } }
  function __dgSafeOriginal(orig,ctx,args){ try{return orig.apply(ctx,args);}catch(e){return undefined;} }
  function hookAll(){ try{
    var B=BattleC(); if(B&&B.prototype&&!B.__dwHook){
      Object.getOwnPropertyNames(B.prototype).forEach(function(k){ var o=B.prototype[k]; if(typeof o!=="function")return; __dgWrapMethod(B.prototype,k,function(orig){ return function(){ var keep=(k==="fadeToMenu"||k==="onBattleEnd"||k==="cleanup"||k==="destroy"||k==="dispose"); if(!keep)window.__curBattle=this;
        /* Speed remains the user choice; see the Arena timing note. */
        try{return orig.apply(this,arguments);} finally{if(keep){window.__curBattle=null;try{window.$DG&&window.$DG.applySpeed&&window.$DG.applySpeed();}catch(e){}}} }; }); });
      B.__dwHook=true; __DG_HOOK_STATUS.battle=true;
    }
    var M=MonC(); if(M&&M.prototype&&!M.__dwHook){ var td=M.prototype.takeDamage; if(typeof td==="function")__dgWrapMethod(M.prototype,"takeDamage",function(orig){ return function(a,b){ var cb=window.__curBattle,mine=false,foe=false; try{mine=isMine(this);foe=!mine&&cb&&((this===cb._enemyMon)||(cb._captainMons&&cb._captainMons.indexOf&&cb._captainMons.indexOf(this)!==-1)||(cb._enemyMons&&cb._enemyMons.indexOf&&cb._enemyMons.indexOf(this)!==-1));}catch(e){} if(F.god&&mine)return; if(F.oneHit&&foe){try{return orig.call(this,(this.getCurrHP?this.getCurrHP():99999)||99999,b);}catch(e){return undefined;}} return __dgSafeOriginal(orig,this,arguments); }; }); M.__dwHook=true; __DG_HOOK_STATUS.mon=true; }
    var A=AbilityC(); if(A&&A.prototype&&!A.__dwHook){ var P=A.prototype; try{ if(!P.__dgForceImpress){ Object.defineProperty(P,"_forceImpress",{configurable:true,get:function(){return F.crit?true:(this.__dwfi===true);},set:function(v){this.__dwfi=v;}}); P.__dgForceImpress=true; } }catch(e){} try{ if(!P.__dgCooldown){ Object.defineProperty(P,"_cooldownCount",{configurable:true,get:function(){return F.noCD?0:(this.__dwcd||0);},set:function(v){this.__dwcd=v;}}); P.__dgCooldown=true; } }catch(e){} A.__dwHook=true; __DG_HOOK_STATUS.ability=true; }
    try{ var HM=K("co.doubleduck.dynamons3.meta.HubMap"); if(HM&&HM.prototype&&!HM.__dwWheel){ HM.__dwWheel=true; if(typeof HM.prototype.openFortuneWheel==="function")__dgWrapMethod(HM.prototype,"openFortuneWheel",function(orig){return function(){try{return this.handleCloseWheel&&this.handleCloseWheel();}catch(e){return __dgSafeOriginal(orig,this,arguments);}};}); } }catch(e){}
  }catch(e){} }
  /* keep-alive: re-apply invuln + status immunity to current team (handles switches) */
  setInterval(function(){ try{ var cb=window.__curBattle; if(cb && (cb._hasEscaped===true || cb._battleOver===true || (("parent" in cb) && cb.parent==null))){ window.__curBattle=null; cb=null; } if(cb){if(!__dgRealPvP(cb))neuterValidator(cb); enforcePvP(cb);} var team=partyMons(); if(cb&&cb._selfMon&&team.indexOf(cb._selfMon)===-1)team.push(cb._selfMon); if(!team.length)return;
    team.forEach(function(m){ if(!m)return; if(m.setInvulnerable){try{m.setInvulnerable(F.god?true:false);}catch(e){}}
      if(m.setImmuneToSick||m.setImmuneToHypno){ try{m.setImmuneToSick&&m.setImmuneToSick(F.statusImmune?true:false); m.setImmuneToHypno&&m.setImmuneToHypno(F.statusImmune?true:false);}catch(e){} } }); }catch(e){} }, 600);

  /* ---- editor scan / apply ---- */
  function scanTeams(){ var cb=window.__curBattle; if(!cb)return null;
    var mine=partyMons(); if(cb._selfMon&&mine.indexOf(cb._selfMon)===-1)mine.unshift(cb._selfMon);
    var foe=[]; if(cb._enemyMon&&foe.indexOf(cb._enemyMon)===-1)foe.push(cb._enemyMon);
    if(cb._captainMons&&cb._captainMons.forEach)cb._captainMons.forEach(function(m){ if(m&&foe.indexOf(m)===-1&&mine.indexOf(m)===-1)foe.push(m); });
    if(cb._enemyMons&&cb._enemyMons.forEach)cb._enemyMons.forEach(function(m){ if(m&&foe.indexOf(m)===-1&&mine.indexOf(m)===-1)foe.push(m); });
    log("scan mine="+mine.length+" foe="+foe.length);
    return {mine:mine,foe:foe}; }
  
  function monName(m){ try{ var d=m.getData?m.getData():null; return (d&&(d.title||d.name||d.id))||(m._id||"Mon"); }catch(e){ return "Mon"; } }
  function hpOf(m){ try{return m.getCurrHP?m.getCurrHP():m._hpCurr;}catch(e){return "?";} }
  function maxOf(m){ try{return m.getTotalHP?m.getTotalHP():m._hpMax;}catch(e){return "?";} }
  function statOf(m,s){ try{return m.getStat?m.getStat(s):"?";}catch(e){return "?";} }
  function setHP(m,v){ try{ v=v|0; if(m&&("_hpMax" in m)&&v>(m._hpMax|0)) m._hpMax=v; if(m&&m.forceSetHP) m.forceSetHP(v); else if(m&&m.setCurrHP) m.setCurrHP(v); else if(m){ m._hpCurr=v; } }catch(e){log("hp "+e);} }
  function setStat(m,s,v){ try{ var cur=m.getStat?m.getStat(s):0; if(m.offsetStat)m.offsetStat(s,(v|0)-(cur|0)); }catch(e){log("stat "+e);} }

  /* ===================== UI ===================== */
  function mk(tag,a,kids){ var e=document.createElement(tag); a=a||{};
    for(var k in a){ if(k==="text")e.textContent=a[k]; else if(k==="html")e.innerHTML=a[k]; else e.setAttribute(k,a[k]); }
    (kids||[]).forEach(function(c){e.appendChild(c);}); return e; }
  function ripple(btn){ btn.addEventListener("click",function(ev){ var r=mk("span",{class:"dw_rip"}); var b=btn.getBoundingClientRect();
    var s=Math.max(b.width,b.height); r.style.width=r.style.height=s+"px"; r.style.left=(ev.clientX-b.left-s/2)+"px"; r.style.top=(ev.clientY-b.top-s/2)+"px";
    btn.appendChild(r); setTimeout(function(){ if(r.parentNode)r.parentNode.removeChild(r); },550); }); }
  function B(label,fn,cls,lockKey){ var b=mk("button",{class:"dw_btn "+(cls||""),text:label}); ripple(b); if(lockKey){ (window.__DG_BTN=window.__DG_BTN||{})[lockKey]=b; window.__DG_LOCK_LABELS[lockKey]=label; if(__dgIsLocked(lockKey)) b.classList.add("locked"); } b.onclick=function(){ if(lockKey&&__dgIsLocked(lockKey)){ try{buzz([18,40,18]);sLock();}catch(e){} toast(__dgLockMsg(lockKey),"lock"); return; } sClick(); fn(); }; return b; }
  /* ===== remote feature availability ===== */
  window.__DG_LOCKS=window.__DG_LOCKS||{}; window.__DG_LOCK_LABELS=window.__DG_LOCK_LABELS||{};
  window.__DG_SW=window.__DG_SW||{}; window.__DG_BTN=window.__DG_BTN||{};
  var __DG_LOCK_URL=((window.__DG_SERVER||"").replace(/\/$/,""))+"/config", __DG_LOCK_TIMER=null, __DG_LOCK_READY=false;
  function __dgIsLocked(k){ return window.__DG_LOCKS&&window.__DG_LOCKS[k]===true; }
  function __dgLockMsg(k){ return "This feature is currently unavailable."; }
  function __dgApplyLocks(){ try{ var SW=window.__DG_SW||{}, BT=window.__DG_BTN||{}, k;
    for(k in SW){ var sw=SW[k]; if(!sw)continue; var locked=__dgIsLocked(k); if(locked&&F[k]){F[k]=false;try{__dgSaveF();}catch(e){}} sw.className="dw_sw"+(locked?" locked":(F[k]?" on":"")); }
    for(k in BT){ if(BT[k])BT[k].classList.toggle("locked",!!__dgIsLocked(k)); }
  }catch(e){} }
  function __dgLockPoll(){
    if(!__DG_LOCK_URL||__DG_LOCK_URL==="/config")return;
    try{ var ctl=window.AbortController?new AbortController():null; var timer=ctl?setTimeout(function(){try{ctl.abort();}catch(e){}},7000):null;
      fetch(__DG_LOCK_URL+"?_="+Date.now(),{cache:"no-store",signal:ctl?ctl.signal:undefined}).then(function(r){if(timer)clearTimeout(timer);if(!r.ok)throw new Error("sync");return r.json();}).then(function(j){
        var fl=j&&j.FeatureLocks; if(!fl||typeof fl!=="object")throw new Error("config"); if(j.Maintenance===true)fl.app=true;window.__DG_LOCKS=fl;__DG_LOCK_READY=true;__dgApplyLocks();
      }).catch(function(){});
    }catch(e){}
  }
  // Use the launch-time configuration supplied by the gated native loader.
  // No periodic HTTP polling, online listener, or visibility-triggered fetch.
  try{if(!window.__DG_BOOT_LOCKS_READY)__dgLockPoll();else{__DG_LOCK_READY=true;__dgApplyLocks();}}catch(e){}

  /* ===================== TEAM SIZE (3 / 4 / 5) ===================== */
  function __dgApplyParty(g,list){
    g.setMonsToPartyPosition(list.slice(0,4).map(function(m,i){ return {position:i,mon:m}; }));
    var P=g.getParty(); for(var i=4;i<list.length;i++) P[i]=list[i]; P.length=list.length; }
  function __dgPartySize(){ try{ var g=GS(), P=g&&g.getParty&&g.getParty(); if(!P) return 3; return Math.max(3,Math.min(5,P.filter(Boolean).length)); }catch(e){ return 3; } }
  function __dgSetPartySize(n){
    var g=GS(); if(!g||typeof g.getParty!=="function"){ toast("Game not ready","err"); return false; }
    n=Math.max(3,Math.min(5,n|0));
    try{
      var cur=(g.getParty()||[]).filter(Boolean), all=g.getPlayerMons(true)||[];
      if(n>cur.length){
        var extra=all.filter(function(x){ return cur.indexOf(x)<0; }).sort(function(a,b){ return b.getLevel()-a.getLevel(); });
        while(cur.length<n&&extra.length) cur.push(extra.shift());
        if(cur.length<n) toast("You only own "+cur.length+" Dynamons","warn");
      } else if(n<cur.length){ cur=cur.slice(0,n); }
      __dgApplyParty(g,cur);
      try{ g.saveMonsData(); }catch(e){}
      toast("Team size: "+cur.length+(cur.length>3?" (extras ride behind the 3 seats)":""),"ok"); sOk(); log("party size -> "+cur.length);
      return true;
    }catch(e){ log("party size err "+e); toast("Could not change team size","err"); return false; } }

  /* ===================== AUTO WORLD PROGRESS CARD ===================== */
  function __dgFmtT(ms){ if(ms==null||!isFinite(ms)) return "--:--"; var s=Math.floor(ms/1000),mn=Math.floor(s/60),h=Math.floor(mn/60); function z(n){ return (n<10?"0":"")+n; } return h?h+":"+z(mn%60)+":"+z(s%60):z(mn)+":"+z(s%60); }
  function __dgAwCard(){
    var c=mk("div",{class:"dw_awcard"});
    c.style.cssText="padding:12px;border-radius:16px;border:1px solid rgba(139,92,246,.4);background:linear-gradient(160deg,rgba(139,92,246,.16),rgba(10,8,24,.6));";
    c.innerHTML='<div style="display:flex;align-items:center;gap:12px"><div id="dw_aw_ring" style="width:70px;height:70px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:conic-gradient(#8b5cf6 0%,rgba(255,255,255,.1) 0)"><div style="width:54px;height:54px;border-radius:50%;background:#0c091c;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff" id="dw_aw_pct">--</div></div><div style="flex:1;min-width:0"><div id="dw_aw_state" style="font-weight:800;font-size:13px;letter-spacing:.04em">IDLE</div><div id="dw_aw_map" style="opacity:.8;font-size:13px;margin-top:3px;font-weight:600">Open a world map</div><div id="dw_aw_now" style="opacity:.65;font-size:11.5px;margin-top:3px"></div></div></div><div id="dw_aw_grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:11px"></div>';
    return c; }
  function __dgAwTick(){
    var S=null; try{ S=window.__DG_autoWorldStatus&&window.__DG_autoWorldStatus(); }catch(e){} if(!S) return;
    var $=function(id){ return document.getElementById(id); }; if(!$("dw_aw_pct")) return;
    var pct=S.pct==null?0:S.pct;
    $("dw_aw_pct").textContent=S.pct==null?"--":pct+"%";
    $("dw_aw_ring").style.background="conic-gradient(#8b5cf6 0 "+pct+"%,rgba(255,255,255,.1) "+pct+"%)";
    $("dw_aw_state").textContent=S.on?"RUNNING":(S.done?"FINISHED":"IDLE"); $("dw_aw_state").style.color=S.on?"#34d399":"#cbd5e1";
    $("dw_aw_map").textContent=S.map?String(S.map).replace(/_/g," ").replace(/\b\w/g,function(x){return x.toUpperCase();}):"Open a world map";
    $("dw_aw_now").textContent=S.on&&S.cur?("Now: "+S.curType+" node "+S.cur):(S.skipped?S.skipped+" node(s) skipped":"");
    var cells=[["Bosses",S.bosses],["Quests",S.quests],["Skipped",S.skipped],["Time",__dgFmtT(S.elapsed)],["Left","~"+S.left],["ETA",__dgFmtT(S.eta)]], g=$("dw_aw_grid"); g.innerHTML="";
    cells.forEach(function(x){ var d=document.createElement("div"); d.style.cssText="text-align:center;padding:7px 2px;border-radius:11px;background:rgba(255,255,255,.05);"; d.innerHTML='<div style="font-size:9.5px;letter-spacing:.12em;opacity:.6;font-weight:700">'+String(x[0]).toUpperCase()+'</div><div style="font-size:15px;font-weight:800;margin-top:3px;color:#fff">'+x[1]+'</div>'; g.appendChild(d); }); }

  /* ===================== PANEL RESIZE (grip + right/bottom edges) ===================== */
  function __dgInitResize(p){
    try{ var sv=JSON.parse(localStorage.getItem("__DG_SIZE")||"null"); if(sv&&sv.w&&sv.h) window.__DG_SIZE=sv; }catch(e){}
    function mkHandle(id,css,html){ var e=mk("div",{id:id}); e.style.cssText=css+";position:absolute;z-index:6;touch-action:none;"; if(html) e.innerHTML=html; p.appendChild(e); return e; }
    var grip=mkHandle("dw_grip","right:0;bottom:0;width:52px;height:52px;display:flex;align-items:flex-end;justify-content:flex-end;padding:9px;cursor:nwse-resize",'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2.4" stroke-linecap="round"><path d="M20 9 9 20M20 15l-5 5"/></svg>');
    var er=mkHandle("dw_edge_r","right:0;top:96px;bottom:52px;width:18px;cursor:ew-resize");
    var eb=mkHandle("dw_edge_b","left:0;right:52px;bottom:0;height:18px;cursor:ns-resize");
    function bind(el,ax,ay){
      var sx=0,sy=0,sw=0,sh=0,on=false;
      function pt(e){ return (e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0])||e; }
      function start(e){ var r=p.getBoundingClientRect(),t=pt(e); sx=t.clientX; sy=t.clientY; sh=p.offsetHeight||r.height; sw=p.offsetWidth||r.width; on=true; try{e.preventDefault();e.stopPropagation();}catch(_){}
        document.addEventListener("touchmove",move,{passive:false}); document.addEventListener("touchend",end); document.addEventListener("mousemove",move); document.addEventListener("mouseup",end); }
      function move(e){ if(!on) return; var t=pt(e),vw=window.innerWidth||360,vh=window.innerHeight||640;
        var w=sw+(ax?t.clientX-sx:0), h=sh+(ay?t.clientY-sy:0);
        w=Math.max(260,Math.min(w,vw,vh,560)); h=Math.min(h,vh); h=Math.max(h,w,300); h=Math.min(h,vh); if(h<w) w=h;
        window.__DG_SIZE={w:Math.round(w),h:Math.round(h)}; try{applyResponsive();}catch(_){}
        try{e.preventDefault();}catch(_){} }
      function end(){ if(!on) return; on=false; document.removeEventListener("touchmove",move); document.removeEventListener("touchend",end); document.removeEventListener("mousemove",move); document.removeEventListener("mouseup",end);
        try{ localStorage.setItem("__DG_SIZE",JSON.stringify(window.__DG_SIZE)); }catch(_){} buzz(8); }
      el.addEventListener("touchstart",start,{passive:false}); el.addEventListener("mousedown",start); }
    bind(grip,1,1); bind(er,1,0); bind(eb,0,1);
    grip.ondblclick=function(){ window.__DG_SIZE=null; try{localStorage.removeItem("__DG_SIZE");}catch(e){} try{applyResponsive();}catch(e){} toast("Menu size reset","ok"); }; }

  function toggle(label,key,onToggle){ var row=mk("div",{class:"dw_tg"});
    window.__DG_LOCK_LABELS[key]=label;
    var sw=mk("div",{class:"dw_sw"+(__dgIsLocked(key)?" locked":(F[key]?" on":""))},[mk("div",{class:"dw_knob"})]);
    (window.__DG_SW=window.__DG_SW||{})[key]=sw;
    sw.onclick=function(){ if(F.autoWorld&&(key==="god"||key==="oneHit"||key==="noCD")){ try{buzz([18,40,18]);sLock();}catch(e){} toast("Locked while Auto World is ON","lock"); return; } if(__dgIsLocked(key)){ try{buzz([18,40,18]);sLock();}catch(e){} toast(__dgLockMsg(key),"lock"); return; } F[key]=!F[key]; try{__dgSaveF();}catch(e){} sw.className="dw_sw"+(F[key]?" on":""); F[key]?sOn():sOff(); toast(label+(F[key]?" ON":" OFF"),F[key]?"ok":"warn"); if(onToggle)onToggle(); };
    row.appendChild(mk("div",{class:"dw_tglab",text:label})); row.appendChild(sw); return row; }

  var TABS=[["Currency","<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><ellipse cx='12' cy='6' rx='8' ry='3'/><path d='M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6'/><path d='M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'/></svg>"],["Skins","<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='3'/><circle cx='9' cy='9' r='2'/><path d='m21 15-5-5L5 21'/></svg>"],["Items","<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 8a6 6 0 0 1 12 0v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z'/><path d='M9 8a3 3 0 0 1 6 0'/><path d='M6 14h12'/></svg>"],["Unlock","<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='11' width='16' height='10' rx='2'/><path d='M8 11V7a4 4 0 0 1 8 0'/></svg>"],["Battle","<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='14.5 17.5 3 6 3 3 6 3 17.5 14.5'/><line x1='13' y1='19' x2='19' y2='13'/><line x1='16' y1='16' x2='20' y2='20'/><line x1='19' y1='21' x2='21' y2='19'/></svg>"],["PvP","<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9H4.5a2.5 2.5 0 0 1 0-5H6'/><path d='M18 9h1.5a2.5 2.5 0 0 0 0-5H18'/><path d='M4 22h16'/><path d='M10 14.6V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22'/><path d='M14 14.6V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 4.8'/><path d='M18 2H6v7a6 6 0 0 0 12 0V2Z'/></svg>"],["Cheats","<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'/></svg>"]];
  var openTab="Currency", panel;
  function refreshCur(){ var c=document.getElementById("dw_coins"),d=document.getElementById("dw_dust"); if(c)c.value=getCoins(); if(d)d.value=getDust(); }

  function buildItems(box){ dwIconCSS(); box.innerHTML=""; var L=consumables().slice(); try{ var DG_have={}; L.forEach(function(x){DG_have[x.id]=1;}); [{id:"ice_suit",title:"ICE SUIT"},{id:"diamond_suit",title:"DIAMOND SUIT"}].forEach(function(s){ if(!DG_have[s.id]) L.push(s); }); }catch(e){} L=L.sort(function(a,b){ return String(a.title||a.id).toUpperCase().localeCompare(String(b.title||b.id).toUpperCase()); });
    var q=""; try{ q=String((document.getElementById("dw_item_search")||{}).value||"").trim().toLowerCase(); }catch(e){}
    if(q)L=L.filter(function(it){ return String((it.title||"")+" "+(it.id||"")).toLowerCase().indexOf(q)!==-1; });
    if(!L.length){ box.appendChild(mk("div",{class:"dw_empty",text:q?"No matching items.":"No items yet - open the game fully, then Refresh."})); return; }
    L.forEach(function(it){ var id=it.id; if(id==="inferno_suit")return; var row=mk("div",{class:"dw_item"});
      var ic=mk("img",{class:"dw_icon"}); var DG_ICONMAP={inferno_armor:"images/general/char_icons/inferno_icon.png",inferno_suit:"images/general/char_icons/inferno_icon.png",inferno:"images/general/char_icons/inferno_icon.png",spirit_suit:"images/general/char_icons/spirit_suit_icon.png",spirit_armor:"images/general/char_icons/spirit_suit_icon.png",ice_suit:"images/general/char_icons/ice_suit_icon.png",diamond_suit:"images/general/char_icons/diamond_suit_icon.png",guardian_skull_king:"images/general/mons/guardian_skull_king/icon.png"}; var DG_src=DG_ICONMAP[id]||("images/items/icons/"+(it.icon||id)+".png"); try{ic.src=DG_src;}catch(e){} ic.onerror=function(){ this.style.visibility="hidden"; }; row.appendChild(ic);
      row.appendChild(mk("div",{class:"dw_iname",text:(it.title||id)}));
      var inp=mk("input",{class:"dw_inp",type:"number",value:itemAmt(id)});
      row.appendChild(inp); row.appendChild(B("Set",function(){ setItem(id,parseInt(inp.value)||0); toast((it.title||id)+" -> "+(inp.value)); },"mini"));
      box.appendChild(row); }); }

  function renderEditor(host){ host.innerHTML=""; var t=scanTeams();
    if(!t){ host.appendChild(mk("div",{class:"dw_empty",text:"No active battle. Enter a fight, then Scan."})); return; }
    function card(m,side,cls){ var c=mk("div",{class:"dw_mon "+cls});
      c.appendChild(mk("div",{class:"dw_montop",html:"<b>"+side+"</b> &middot; "+monName(m)}));
      function blk(lbl,val,onset,withFull){ var bl=mk("div",{class:"dw_stat"});
        bl.appendChild(mk("div",{class:"dw_statlbl",text:lbl}));
        var ctl=mk("div",{class:"dw_statctl"});
        var inp=mk("input",{class:"dw_inp",type:"number",value:val}); ctl.appendChild(inp);
        ctl.appendChild(B("Set",function(){ onset(parseInt(inp.value)||0); },"mini"));
        if(withFull) ctl.appendChild(B("Full",function(){ setHP(m,maxOf(m)); setTimeout(function(){renderEditor(host);},120); },"mini alt"));
        bl.appendChild(ctl); c.appendChild(bl); }
      blk("HP "+hpOf(m)+" / "+maxOf(m), hpOf(m), function(v){ setHP(m,v); setTimeout(function(){renderEditor(host);},120); }, true);
      ["atk","def","aim"].forEach(function(s){ blk(s.toUpperCase()+" "+statOf(m,s), statOf(m,s), function(v){ setStat(m,s,v); toast(s.toUpperCase()+" -> "+v); }, false); });
      return c; }
    host.appendChild(mk("div",{class:"dw_grouphdr",text:"YOUR TEAM"}));
    if(!t.mine.length)host.appendChild(mk("div",{class:"dw_empty",text:"(none)"}));
    t.mine.forEach(function(m){ host.appendChild(card(m,"YOU","mine")); });
    host.appendChild(mk("div",{class:"dw_grouphdr",text:"ENEMY (ACTIVE)"}));
    if(!t.foe.length)host.appendChild(mk("div",{class:"dw_empty",text:"(none)"}));
    if(t.foe.length){host.appendChild(card(t.foe[0],"ENEMY","foe"));} }

  function applyResponsive(){ try{ var p=document.getElementById("dw_panel"); if(!p)return; var __US=window.__DG_SIZE; if(__US&&__US.w&&__US.h){ var __vh=window.innerHeight||640,__vw=window.innerWidth||360; var __w=Math.min(__US.w,__vw), __h=Math.min(__US.h,__vh); p.style.transform=""; p.style.setProperty("width",__w+"px","important"); p.style.setProperty("max-width",__w+"px","important"); p.style.setProperty("height",__h+"px","important"); p.style.setProperty("max-height",__h+"px","important"); return; } else { p.style.removeProperty("max-width"); p.style.removeProperty("max-height"); } if(!F.responsive){ p.style.transform=""; p.style.transformOrigin=""; p.style.height="100%"; p.style.width="340px"; return; } var VV=window.visualViewport; var vw=(VV&&VV.width)||window.innerWidth||360; var vh=(VV&&VV.height)||window.innerHeight||640; var DESIGN=340, scale; if(vw<DESIGN){ scale=vw/DESIGN; } else if(vw>=820){ scale=Math.min(1.5,(vw*0.34)/DESIGN); } else { scale=1+Math.min(0.25,(vw-DESIGN)/1600); } scale=Math.min(scale, vw/DESIGN); if(scale<0.7)scale=0.7; if(scale>1.5)scale=1.5; p.style.width="340px"; p.style.transformOrigin="top left"; p.style.transform="scale("+scale.toFixed(3)+")"; p.style.height=(vh/scale)+"px"; p.style.maxHeight=(vh/scale)+"px"; }catch(e){} }
  try{ ["resize","orientationchange"].forEach(function(ev){ window.addEventListener(ev,function(){try{applyResponsive();}catch(e){}}); }); if(window.visualViewport){ window.visualViewport.addEventListener("resize",function(){try{applyResponsive();}catch(e){}}); } setInterval(function(){ var pp=document.getElementById("dw_panel"); if(pp&&pp.style.display!=="none"){ try{applyResponsive();}catch(e){} } },1000); }catch(e){}
  function installGlobalIsolation(){ try{ if(window.__DG_GLOBAL_ISOLATION__)return; window.__DG_GLOBAL_ISOLATION__=true; window.__DG_RUNTIME_DEGRADED=false; window.addEventListener("error",function(e){ if(e&&e.target&&e.target!==window)return; window.__DG_RUNTIME_DEGRADED=true; },true); window.addEventListener("unhandledrejection",function(){ window.__DG_RUNTIME_DEGRADED=true; },true); }catch(e){} }
  installGlobalIsolation();
  function compatState(){ try{ var a=[!!GS(),!!DB(),!!MonC(),!!BattleC(),!!AbilityC()]; return {ready:a.every(Boolean)&&!window.__DG_RUNTIME_DEGRADED,items:a[0]&&a[1],battle:a[2]&&a[3]&&a[4]}; }catch(e){return {ready:false,items:false,battle:false};} }
  function compatNote(){ var c=compatState(), n=mk("div",{class:"dw_note dw_compat"}); n.textContent="Compatibility  ·  Currency "+(c.items?"✓":"—")+"  ·  Battle "+(c.battle?"✓":"—")+"  ·  "+(c.ready?"Ready":"Limited"); return n; }

  function renderBody(){ try{applyResponsive();}catch(e){} var body=document.getElementById("dw_body"); if(!body)return; try{ if(window.__DG_AWTIMER){ clearInterval(window.__DG_AWTIMER); window.__DG_AWTIMER=null; } }catch(e){} body.classList.remove("dw_in"); body.innerHTML=""; body.appendChild(compatNote());
    if(openTab==="Currency"){
      body.appendChild(mk("div",{class:"dw_grouphdr",text:"GAME SPEED"}));
      var speedRow=mk("div",{class:"dw_speedrow"}); var speedValue=mk("span",{id:"dw_speed_value",class:"dw_speedvalue",text:__dgSpeed().toFixed(1)+"×"});
      var speedRange=mk("input",{id:"dw_speed",class:"dw_speed",type:"range",min:"0.1",max:"8",step:"0.1",value:__dgSpeed()}); speedRange.oninput=function(){if(F.autoWorld){speedRange.value=4;return;}__dgSetSpeed(speedRange.value,speedValue,false);}; speedRange.onchange=function(){if(F.autoWorld){speedRange.value=4;return;}__dgSetSpeed(speedRange.value,speedValue,true);}; speedRow.appendChild(speedRange); speedRow.appendChild(speedValue); body.appendChild(speedRow);
      body.appendChild(mk("div",{class:"dw_note",text:"Adjust from 0.1× to 8.0×. The selected value is saved automatically."}));
      var r1=mk("div",{class:"dw_field"}); r1.appendChild(mk("label",{text:"Coins"})); var ci=mk("input",{id:"dw_coins",class:"dw_inp wide",type:"number",value:getCoins()}); r1.appendChild(ci); r1.appendChild(B("Set",function(){setCoins(parseInt(ci.value)||0);},"go","setCoins"));
      var r2=mk("div",{class:"dw_field"}); r2.appendChild(mk("label",{text:"Dust"})); var di=mk("input",{id:"dw_dust",class:"dw_inp wide",type:"number",value:getDust()}); r2.appendChild(di); r2.appendChild(B("Set",function(){setDust(parseInt(di.value)||0);},"go","setDust"));
      body.appendChild(r1); body.appendChild(r2);
      var q=mk("div",{class:"dw_quick"}); q.appendChild(B("+10K Coins",function(){setCoins(getCoins()+10000);},"chip","setCoins")); q.appendChild(B("+10K Dust",function(){setDust(getDust()+10000);},"chip","setDust")); q.appendChild(B("MAX Both",function(){setCoins(999999);setDust(999999);},"chip gold","setCoins")); body.appendChild(q);
    } else if(openTab==="Items"){
      body.appendChild(mk("div",{class:"dw_grouphdr",text:"ITEMS"}));
      var search=mk("input",{id:"dw_item_search",class:"dw_inp",type:"search",placeholder:"Search items...",autocomplete:"off"}); body.appendChild(search);
      var top=mk("div",{class:"dw_field"}); var ai=mk("input",{class:"dw_inp wide",type:"number",value:999}); top.appendChild(mk("label",{text:"Set ALL"})); top.appendChild(ai); top.appendChild(B("Apply",function(){ var n=parseInt(ai.value)||0; consumables().forEach(function(it){setItem(it.id,n);}); toast("All items -> "+n); sOk(); buildItems(document.getElementById("dw_items")); },"go")); body.appendChild(top);
      body.appendChild(B("Refresh List",function(){ buildItems(document.getElementById("dw_items")); },"chip"));
      var list=mk("div",{id:"dw_items",class:"dw_list"}); body.appendChild(list); search.oninput=function(){buildItems(list);}; buildItems(list);
    } else if(openTab==="Unlock"){
      [["Unlock EVERYTHING",unlockEverything],["Unlock ALL Dynamons",unlockMons],["Unlock ALL Skins",unlockSkins],["Unlock ALL Emojis",unlockEmotes]].forEach(function(p){ body.appendChild(B(p[0],p[1],"full")); }); try{ body.appendChild(toggle("Save Settings","saveSettings",function(){ if(F.saveSettings)__dgSaveF(); else { try{localStorage.removeItem(__DG_SETTINGS_KEY);localStorage.removeItem("__DG_F");}catch(e){} } })); }catch(e){} try{ body.appendChild(toggle("Haptic Feedback","haptics",function(){})); }catch(e){} try{ body.appendChild(toggle("Responsive UI (Beta)","responsive",applyResponsive)); }catch(e){} body.appendChild(B("Reset Saved Settings",function(){ __dgResetF(); renderBody(); toast("Settings restored","ok"); sOk(); },"chip"));
      body.appendChild(mk("div",{class:"dw_note",text:"After unlocking world, re-open the map to refresh."}));
    } else if(openTab==="Battle"){
      body.appendChild(mk("div",{class:"dw_grouphdr",text:"AUTO WORLD (BETA)"}));
      body.appendChild(mk("div",{class:"dw_note",text:"Open a world map, then switch ON. Clears boss + quest nodes by itself (rescans live), 1 enemy Dynamon per boss. God Mode, One-Hit Kill, No Cooldowns and 4x speed stay locked ON until you switch it OFF."}));
      body.appendChild(toggle("Auto World","autoWorld",function(){ try{ window.__DG_autoWorld&&window.__DG_autoWorld(!!F.autoWorld); }catch(e){ toast("Auto World error","err"); } }));
      body.appendChild(__dgAwCard()); __dgAwTick(); window.__DG_AWTIMER=setInterval(__dgAwTick,1000);
      body.appendChild(mk("div",{class:"dw_grouphdr",text:"TEAM SIZE"}));
      (function(){ var cur=__dgPartySize(), row=mk("div",{class:"dw_quick"});
        [3,4,5].forEach(function(n){ row.appendChild(B(n+" Dynamons",function(){ if(__dgSetPartySize(n)) renderBody(); },"chip"+(cur===n?" gold":""))); });
        body.appendChild(row);
        body.appendChild(mk("div",{class:"dw_note",text:"Keep up to 5 Dynamons in your team. The game still shows 3 seats; the extras ride behind them. Switch back to 3 and the extras return to your collection."})); })();
      body.appendChild(mk("div",{class:"dw_grouphdr",text:"STABLE BATTLE CONTROLS"}));
      body.appendChild(toggle("God Mode (you take 0 dmg)","god",hookAll));
      body.appendChild(toggle("One-Hit Kill (enemy)","oneHit",hookAll));
      body.appendChild(toggle("Always Critical","crit",hookAll));
      body.appendChild(toggle("Status Immunity (your team)","statusImmune",hookAll));
      body.appendChild(toggle("No Cooldowns","noCD",hookAll)); body.appendChild(toggle("Always Catch (discatch = 100%)","alwaysCatch",function(){ installCatchHook(); }));
      body.appendChild(B("Scan Team & Enemy",function(){ hookAll(); renderEditor(document.getElementById("dw_ed")); },"full go"));
      var ed=mk("div",{id:"dw_ed",class:"dw_list tall"}); body.appendChild(ed);
    } else if(openTab==="PvP"){
      body.appendChild(mk("div",{class:"dw_grouphdr",text:"ADVANCED CONTROLS"}));
      body.appendChild(mk("div",{class:"dw_note",text:"PvP cheats. Use Force Bot Match for safest farming. Toggle ON before queuing."}));
      body.appendChild(toggle("Always Bot (bots only)","botMatch",function(){window.__DG_FORCEBOT=!!F.botMatch;try{installPvP();}catch(e){}}));
      body.appendChild(toggle("PvP Beta (auto-grind)","autoGrind",function(){ var on=F.autoGrind; ["botMatch","oneHit","god"].forEach(function(kk){ F[kk]=on; var ss=window.__DG_SW&&window.__DG_SW[kk]; if(ss)ss.className="dw_sw"+(on?" on":""); }); window.__DG_FORCEBOT=!!F.botMatch; try{installPvP();}catch(e){} try{window.__DG_grind&&window.__DG_grind(on);}catch(e){} }));
      body.appendChild(toggle("Always Win Match","winTrophy",installPvP));
      body.appendChild(toggle("No Trophy Loss","noTrophyLoss",installPvP));
    } else if(openTab==="Cheats"){
      body.appendChild(mk("div",{class:"dw_grouphdr",text:"ADVANCED CONTROLS"}));
      body.appendChild(mk("div",{class:"dw_note",text:"Toggle a cheat ON, then trigger the action (battle / heal / rename). Some apply on the next battle. Shop Fix stays on automatically."}));
      
      
      body.appendChild(toggle("Full Heal Potions","fullheal",__dgSyncDGF));
      body.appendChild(toggle("Faster Item Use in PvP","pvpcd",__dgSyncDGF));
      body.appendChild(toggle("No Item Wait Time","itemtimer",__dgSyncDGF));
      body.appendChild(toggle("Refill Items Every Turn","turnreset",__dgSyncDGF));
      body.appendChild(toggle("Use Up to 5 Items Per Turn","items5",__dgSyncDGF));
      body.appendChild(toggle("Longer Nicknames","nicklen",__dgSyncDGF));
      body.appendChild(toggle("Allow Longer Names","nickval",__dgSyncDGF));
      body.appendChild((function(){var row=mk("div",{class:"dw_tg"});var sw=mk("div",{class:"dw_sw on"},[mk("div",{class:"dw_knob"})]);sw.style.opacity="0.6";sw.style.cursor="not-allowed";sw.onclick=function(){toast("Shop Fix is always on (locked)","ok");};row.appendChild(mk("div",{class:"dw_tglab",text:"Fix Shop Freeze (always on)"}));row.appendChild(sw);return row;})());
    } else if(openTab==="Skins"){
      try{ window.__DG_buildSkinTab(body,{mk:mk,B:B,toast:toast,showRestart:showRestart}); }catch(e){ body.appendChild(mk("div",{class:"dw_note",text:"Skins unavailable"})); }
    }
    requestAnimationFrame(function(){ body.classList.add("dw_in"); }); }

  function buildUI(){ injectCSS();
    var fab=mk("button",{id:"dw_fab"}); fab.innerHTML="<img src=\""+DW_LOGO+"\" class=\"dw_fabimg\"/>"; document.body.appendChild(fab);
    panel=mk("div",{id:"dw_panel"});
    var head=mk("div",{id:"dw_head"}); var menuLogo=mk("div",{id:"dw_menu_logo",class:"dw_logo",html:"<img src=\""+DW_LOGO+"\" class=\"dw_hlogo\"/><span class=dw_btxt><b>"+DW_BRAND+"</b><small>Dynamons Mod <span class=dw_ver>v7.0</span></small></span>"}); menuLogo.onclick=function(){sClick();hide();}; head.appendChild(menuLogo);
    var close=mk("div",{class:"dw_x",text:"\u2715"}); close.onclick=function(){ sClick(); hide(); }; head.appendChild(close); panel.appendChild(head);
    var tabs=mk("div",{id:"dw_tabs"}); TABS.forEach(function(p){ var d=mk("div",{class:"dw_tab"+(p[0]===openTab?" act":"")}); d.innerHTML="<i>"+p[1]+"</i><u>"+p[0]+"</u>";
      d.onclick=function(){ sClick(); openTab=p[0]; [].forEach.call(tabs.children,function(c){c.classList.remove("act");}); d.classList.add("act"); renderBody(); }; tabs.appendChild(d); }); panel.appendChild(tabs);
    panel.appendChild(mk("div",{id:"dw_body",class:"dw_in"}));
    var foot=mk("div",{id:"dw_foot"});
    foot.appendChild(mk("div",{class:"dw_credit",html:"Modded by <b>"+DW_BRAND+"</b>"}));
    var chips=mk("div",{class:"dw_chips"});
    DW_SOCIAL.forEach(function(s){ var ch=mk("div",{class:"dw_chip",html:"<i>"+s[0]+"</i><u>"+s[1]+"</u>"});
      ch.onclick=function(){ sClick(); try{ window.open(s[2],"_blank"); }catch(e){ try{ location.href=s[2]; }catch(_){} } }; chips.appendChild(ch); });
    foot.appendChild(chips); panel.appendChild(foot);
    document.body.appendChild(panel); try{ __dgInitResize(panel); }catch(e){ log("resize init err "+e); }
    fab.onclick=function(){ if(panel.__drag)return; sClick(); panel.classList.contains("show")?hide():show(); };
    makeDraggable(fab);
    renderBody(); log("UI ready"); }
  function show(){ panel.classList.add("show"); panel.__drag=false; var f=document.getElementById("dw_fab"); if(f){f.classList.add("dw_fab_open");f.setAttribute("aria-hidden","true");} refreshCur(); renderBody(); }
  function hide(){ panel.classList.remove("show"); var f=document.getElementById("dw_fab"); if(f){f.classList.remove("dw_fab_open");f.removeAttribute("aria-hidden");} }
  function makeDraggable(fab){ var sx,sy,ox,oy,moved; fab.addEventListener("touchstart",function(e){ if(panel&&panel.classList.contains("show"))return; var t=e.touches[0]; sx=t.clientX; sy=t.clientY; var b=fab.getBoundingClientRect(); ox=b.left; oy=b.top; moved=false; panel.__drag=false; },{passive:true});
    fab.addEventListener("touchmove",function(e){ if(panel&&panel.classList.contains("show"))return; var t=e.touches[0]; var dx=t.clientX-sx, dy=t.clientY-sy; if(Math.abs(dx)+Math.abs(dy)>8){moved=true;panel.__drag=true;} fab.style.left=(ox+dx)+"px";fab.style.top=(oy+dy)+"px";fab.style.right="auto"; },{passive:true});
    fab.addEventListener("touchend",function(){ if(panel&&panel.classList.contains("show"))return; if(panel.__drag)buzz(8); setTimeout(function(){panel.__drag=false;},50); }); }

  function probe(){ var r=REG(); log("registry: "+(r?"OK":"MISSING (patch not applied)"));
    log("GameState:"+(GS()?"OK":"X")+" GameplayDB:"+(DB()?"OK":"X")+" Mon:"+(MonC()?"OK":"X")+" Battle:"+(BattleC()?"OK":"X")+" Ability:"+(AbilityC()?"OK":"X"));
    if(GS())killCheat(); hookAll(); }

  function boot(){ if(!document.body){ return setTimeout(boot,200); } /* Native interface owns rendering. */
    var n=0,iv=setInterval(function(){ n++; if(GS()){ clearInterval(iv); probe(); installCatchHook(); installStealth(); refreshCur(); toast("Mod ready",  "ok"); log("Ready. Coins="+getCoins()+" Dust="+getDust()); }
      else if(n>180){ clearInterval(iv); log("Timeout waiting for GameState - registry patch applied?"); toast("Some features are unavailable on this version.","err"); } },400); }

  /* ===================== CSS ===================== */
  function injectCSS(){ if(document.getElementById("dw_css"))return; var s=document.createElement("style"); s.id="dw_css"; s.textContent=DW_CSS; document.head.appendChild(s); }

  F.shopfix=true;
  window.__DG_API={ F:F, hookAll:hookAll, getSpeed:__dgSpeed, setSpeed:function(v){ __dgSetSpeed(v,null,false); }, toast:function(m,t){ try{toast(m,t);}catch(e){} }, set:function(k,v){ if(k==="shopfix")v=true; F[k]=!!v; var sw=window.__DG_SW&&window.__DG_SW[k]; if(sw)sw.className="dw_sw"+(F[k]?" on":""); try{hookAll();}catch(e){} } };

  window.__DG_NATIVE_INTERNAL={
    coins:setCoins,dust:setDust,items:consumables,itemAmt:itemAmt,setItem:setItem,
    unlockMons:unlockMons,unlockSkins:unlockSkins,unlockEmotes:unlockEmotes,unlockAvatars:unlockAvatars,
    unlockIAP:unlockIAP,party:__dgSetPartySize,scan:scanTeams,hp:setHP,stat:setStat,
    sync:__dgSyncDGF,save:__dgSaveF,catchHook:installCatchHook,pvp:installPvP
  };
  boot();
})();
;/* ============================================================
   DYNAMON GAMER — v6.6 FIX PACK
   100% bot | cheater-kill | always-win | new scan UI | AUTO TROPHY GRIND
   (node-unlock removed per user request)
   ============================================================ */
(function(){
  "use strict";
  if (window.__DG_FIX66__) return; window.__DG_FIX66__ = true;
  function L(){ try{ var a=['%c[DG]','color:#FF6A2B;font-weight:bold']; for(var i=0;i<arguments.length;i++)a.push(arguments[i]); console.log.apply(console,a);}catch(e){} }
  function REG(){ return window.$DW || window.$hxClasses || null; }
  function K(f){ var r=REG(); return r? r[f] : null; }
  function safe(fn,l){ try{ return fn(); }catch(e){ L('fail',l,e&&e.message); } }

  var GS = K('co.doubleduck.dynamons3.meta.GameState');
  var BT = K('co.doubleduck.dynamons3.core.Battle');

  if (typeof window.__DG_FORCEBOT === 'undefined') window.__DG_FORCEBOT = false;

  /* ---------- CHEATER POPUP: kill every path ---------- */
  safe(function(){
    if (GS && typeof GS.checkCheater==='function') GS.checkCheater = function(){ return; };
    if (BT && BT.prototype){
      if (typeof BT.prototype.handleCheatError==='function') BT.prototype.handleCheatError = function(){ return; };
      if (typeof BT.prototype.reportUnfair==='function') BT.prototype.reportUnfair = function(){ return; };
      if (typeof BT.prototype.displayMPErrors==='function'){
        var od = BT.prototype.displayMPErrors;
        BT.prototype.displayMPErrors = function(){ try{ var c=this._mpError; if(c===12||c===13||c===14){ this._mpError=0; return; } }catch(e){} return od.apply(this, arguments); };
      }
    }
    var r=REG(); for(var k in r){ var c=r[k]; if(!c||!c.prototype) continue;
      ['validateEnemyTeam','validateData','validateTeam','onCheatDetected','flagCheater'].forEach(function(m){
        if(typeof c.prototype[m]==='function'){ var o=c.prototype[m]; c.prototype[m]=function(){ try{return o.apply(this,arguments);}catch(e){return;} }; }
      });
    }
    L('cheater popup neutralized');
  },'cheater');

  /* ---------- ALWAYS WIN (bot matches only) ---------- */
  safe(function(){
    if (BT && BT.prototype && typeof BT.prototype.showMPWinner==='function'){
      var ow = BT.prototype.showMPWinner;
      BT.prototype.showMPWinner = function(a,b){
        var A=window.__DG_API, flags=A&&A.F||{}, real=window.__DG_isRealArena&&window.__DG_isRealArena(this);
        // The game expects numeric 0=win, 1=loss, 2=give-up. true means LOSS.
        if(!real && this._mpData && this._mpData.botBattle===true && flags.winTrophy)a=0;
        var profile=K('co.doubleduck.dynamons3.data.GameplayDB'), data=profile&&profile.mpProfileDat&&profile.mpProfileDat();
        var protect=!real && this._mpData && this._mpData.botBattle===true && flags.noTrophyLoss && a!==0;
        var lose=data&&data.pvpLoseTrophies,giveUp=data&&data.pvpGiveUpTrophies;
        try{if(protect&&data){data.pvpLoseTrophies=0;data.pvpGiveUpTrophies=0;}return ow.call(this,a,b);}
        finally{if(protect&&data){data.pvpLoseTrophies=lose;data.pvpGiveUpTrophies=giveUp;}}
      };
    }
  },'alwaysWinBot');

  /* ---------- NEW SCAN UI (vertical stacked, no overflow) ---------- */
  safe(function(){
    var css = [
      ".dw_stat{display:flex;flex-direction:column;gap:5px;padding:8px 10px;border-radius:11px;background:var(--glass2);border:1px solid var(--line);margin:6px 0;box-sizing:border-box;max-width:100%;}",
      ".dw_statlbl{font-size:12px;font-weight:700;opacity:.9;letter-spacing:.3px;}",
      ".dw_statctl{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}",
      ".dw_statctl .dw_inp,.dw_inp{flex:1 1 60px;min-width:0;box-sizing:border-box;padding:8px 10px;}",
      ".dw_btn.mini{padding:7px 12px;font-size:11px;font-weight:600;border-radius:9px;flex:0 0 auto;min-width:auto;line-height:1;}",
      ".dw_btn.mini.alt{background:rgba(255,255,255,.06);box-shadow:none;}",
      ".dw_mon{box-sizing:border-box;max-width:100%;padding:10px;}",
      ".dw_montop{flex-wrap:wrap;gap:6px;margin-bottom:4px;}"
    ].join("\n");
    function inject(){ try{ var d=document; if(!d||!d.head){ return setTimeout(inject,400); } var s=d.createElement("style"); s.id="dg_uifix66"; s.textContent=css; d.head.appendChild(s); L('scan UI patched'); }catch(e){ setTimeout(inject,600); } }
    inject();
  },'uiCSS');

  /* ---------- AUTO TROPHY GRIND (beta) ---------- */
  var grindTimer=null, wakeLock=null, grindWins=0, EventCls=null;
  function reqWake(){ try{ if(navigator.wakeLock && !wakeLock) navigator.wakeLock.request("screen").then(function(w){ wakeLock=w; w.addEventListener&&w.addEventListener("release",function(){wakeLock=null;}); }).catch(function(){}); }catch(e){} }
  function relWake(){ try{ wakeLock&&wakeLock.release&&wakeLock.release(); }catch(e){} wakeLock=null; }
  /* private diagnostics intentionally omitted from the runtime build */
  function getHUD(){ try{ var cb=window.__curBattle; if(cb&&cb._uiButtons&&cb._uiButtons._abilBtns&&cb._uiButtons._abilBtns.length) return cb._uiButtons; }catch(e){} return null; }
  function fireFirstAbility(){ var hud=getHUD(); if(!hud||!hud._currMon||typeof hud._currMon.getCurrHand!=="function") return false; var myTurn=null; try{ var BC=window.$DW&&window.$DW["co.doubleduck.dynamons3.core.Battle"];   if(BC&&typeof BC._playerTurn==="boolean"){ myTurn=BC._playerTurn; if(BC.isProcessingTurn===true) myTurn=false; } }catch(e){} if(myTurn!==true) return false; var hand; try{ hand=hud._currMon.getCurrHand(); }catch(e){ return false; } if(!hand||!hand.length) return false; var btns=hud._abilBtns||[]; for(var i=0;i<hand.length;i++){   var ab=hand[i];   if(!ab||typeof ab.handleBtn!=="function") continue;   if(btns[i]==null) continue;   var cd=false; try{ cd=ab.inCooldown&&ab.inCooldown(); }catch(e){}   if(cd) continue;   try{ ab._showingTooltip=false; ab.handleBtn({type:"BUTTON_ACT_EVENT"}); try{L("fired abil "+i);}catch(_){} return true; }   catch(e){ try{L("fire err",e&&e.message);}catch(_){} } } return false; } function startMatch(){ var now=Date.now(); if(window.__DG_MATCH_T&&(now-window.__DG_MATCH_T)<6000) return false; var BB=K('co.doubleduck.dynamons3.meta.BotBattleMatchmake'); if(BB){ try{ window.__DG_MATCH_T=now; BB.Instance().createFight(null); try{L('startMatch: createFight');}catch(_){}; return true; }catch(e){ L('startMatch fail',e&&e.message); } } return false; }
  function inBattle(){ var hud=getHUD(); return !!(hud && hud._abilBtns && hud._abilBtns.length); }
  function dgStage(){ try{ var a=window.$DW&&window.$DW["lime.app.Application"]; a=a&&a.current; var s=a&&a.__window&&a.__window.stage; return s||null; }catch(e){ return null; } }
  function dgVisible(n){ try{ if(n.get_visible&&!n.get_visible()) return false; if(n._enabled===false) return false; if(typeof n.get_alpha==="function"&&n.get_alpha()<=0.02) return false; }catch(e){} return true; }
  function dgText(n){ var t=""; (function w(o,d){ if(!o||d>14) return; try{ if(typeof o._text==="string"&&o._text) t+=" "+o._text; }catch(e){} try{ if(typeof o._dgText==="string"&&o._dgText) t+=" "+o._dgText; }catch(e){} var k; try{k=o.__children;}catch(e){} if(k&&k.length) for(var i=0;i<k.length;i++) w(k[i],d+1); })(n,0); return t.replace(/\s+/g," ").trim(); }
  function dgButtons(){ var st=dgStage(); var out=[]; if(!st) return out; (function w(o,d){ if(!o||d>60) return; var vis=true; try{ vis=dgVisible(o); }catch(e){} if(!vis) return; var act=false; try{ act=(typeof o.act==="function"); }catch(e){} if(act) out.push({btn:o,depth:d,txt:dgText(o)}); var k; try{k=o.__children;}catch(e){} if(k&&k.length) for(var i=0;i<k.length;i++) w(k[i],d+1); })(st,0); return out; }
  function dgClickLabel(label){ var bs=dgButtons(); var L2=label.toUpperCase(); var m=bs.filter(function(b){ return b.txt&&b.txt.toUpperCase().indexOf(L2)>=0; }); m.sort(function(a,b){return b.depth-a.depth;}); if(m.length){ try{ m[0].btn.act(); try{L("clicked \""+label+"\" ("+m[0].txt+")");}catch(e){} return true; }catch(e){ try{L("click err",e&&e.message);}catch(_){}; } } return false; }
  function tapResultsNext(){ var labels=["NEXT","CLAIM","COLLECT","CONTINUE","OK","DONE","CLOSE","TAP TO CONTINUE"]; for(var i=0;i<labels.length;i++){ if(dgClickLabel(labels[i])) return true; } return false; }
  function tick(){ if(!window.__DG_GRIND){ relWake(); return; } if(window.__DG_GRIND_PAUSED){relWake();grindTimer=setTimeout(tick,350);return;} var delay=900; safe(function(){ reqWake();   if(tapResultsNext()){ delay=550; window.__DG_commitWait=Date.now()+(window.__DG_commitMs||2500); }   else if(inBattle()){ window.__DG_MATCH_T=0; delay = fireFirstAbility()?170:150; }   else { if(window.__DG_commitWait&&Date.now()<window.__DG_commitWait){ delay=300; } else { startMatch(); delay=1100; } } },'grindTick'); grindTimer=setTimeout(tick, delay); }
  /* exposed to the menu toggle (which lives in the mod closure) */
  window.__DG_grind = function(on){
    window.__DG_GRIND = !!on; window.__DG_GRIND_PAUSED=false;
    if(on){ window.__DG_FORCEBOT = true; window.__DG_armed=true; window.__DG_lastAbilX=null; reqWake(); L('AUTO GRIND: ON — bot matches will auto-play & win. Keep app foreground.'); if(grindTimer)clearTimeout(grindTimer); tick(); }
    else { if(grindTimer)clearTimeout(grindTimer); grindTimer=null; relWake(); L('AUTO GRIND: OFF'); }
  };
  window.__DG_grindPause=function(on){window.__DG_GRIND_PAUSED=!!on;if(on)relWake();};
  /* re-acquire wake lock if tab regains focus */
  try{ document.addEventListener("visibilitychange", function(){ if(!document.hidden && window.__DG_GRIND) reqWake(); }); }catch(e){}

  L('v6.6 active. FORCE_BOT =', window.__DG_FORCEBOT, '| Auto-Grind ready (toggle in PvP tab).');
})();
;/* ============================================================
   DG AUTO WORLD v1 (beta)  -  scan-driven world/boss/quest autopilot
   Toggle lives in the Battle tab. Everything is discovered live from the
   running game (map screen nodes, GameState completion), nothing hardcoded.
   Skips: captain fights, online-arena (medal/event) quests.
   ============================================================ */
(function(){
  "use strict";
  if(window.__DG_AW_LOADED) return; window.__DG_AW_LOADED=true;
  var LOG=window.__DG_AW_LOG=[];
  function L(m){ try{ m="[AW "+new Date().toLocaleTimeString()+"] "+m; LOG.push(m); if(LOG.length>200)LOG.shift(); console.log(m); }catch(e){} }
  function API(){ return window.__DG_API||null; }
  function REG(){ return window.$DW||window.$hxClasses||null; }
  function K(n){ var r=REG(); return r?r[n]:null; }
  function GS(){ return K("co.doubleduck.dynamons3.meta.GameState"); }

  /* ---------- stage walking ---------- */
  function stage(){ try{ var a=K("lime.app.Application"); a=a&&a.current; var s=a&&a.__window&&a.__window.stage; return s||null; }catch(e){ return null; } }
  function kids(o){ try{ return o.__children||null; }catch(e){ return null; } }
  function vis(o){ try{ if(o.get_visible&&!o.get_visible()) return false; if(o._enabled===false) return false; if(typeof o.get_alpha==="function"&&o.get_alpha()<=0.02) return false; }catch(e){} return true; }
  function find(pred,needVisible){ var st=stage(), hit=null; if(!st) return null;
    (function w(o,d){ if(hit||!o||d>60) return; if(needVisible&&!vis(o)) return; var ok=false; try{ ok=!!pred(o); }catch(e){} if(ok){ hit=o; return; } var k=kids(o); if(k) for(var i=0;i<k.length&&!hit;i++) w(k[i],d+1); })(st,0);
    return hit; }
  function textOf(n){ var t=""; (function w(o,d){ if(!o||d>14) return; try{ if(typeof o._text==="string"&&o._text) t+=" "+o._text; }catch(e){} try{ if(typeof o._dgText==="string"&&o._dgText) t+=" "+o._dgText; }catch(e){} var k=kids(o); if(k) for(var i=0;i<k.length;i++) w(k[i],d+1); })(n,0); return t.replace(/\s+/g," ").trim(); }
  function buttons(){ var st=stage(), out=[]; if(!st) return out;
    (function w(o,d){ if(!o||d>60) return; if(!vis(o)) return; var act=false; try{ act=(typeof o.act==="function"); }catch(e){} if(act) out.push({btn:o,depth:d,txt:textOf(o)}); var k=kids(o); if(k) for(var i=0;i<k.length;i++) w(k[i],d+1); })(st,0);
    return out; }
  var RESULT_LABELS=["NEXT","CLAIM","COLLECT","CONTINUE","OK","DONE","TAP TO CONTINUE"];
  function clickLabels(labels){ var bs=buttons(); if(!bs.length) return null;
    for(var pass=0;pass<2;pass++) for(var li=0;li<labels.length;li++){ var want=labels[li];
      var m=bs.filter(function(b){ var t=(b.txt||"").toUpperCase(); return pass===0? t===want : (t.indexOf(want+" ")===0); });
      if(m.length){ m.sort(function(a,b){return b.depth-a.depth;}); try{ m[0].btn.act(); return want; }catch(e){} } }
    return null; }

  /* ---------- battle ---------- */
  function hud(){ try{ var cb=window.__curBattle, h=cb&&cb._uiButtons; if(h&&h._abilBtns&&h._abilBtns.length) return h; }catch(e){} return null; }
  function myTurn(){ try{ var BC=K("co.doubleduck.dynamons3.core.Battle"); if(BC&&typeof BC._playerTurn==="boolean"){ if(BC.isProcessingTurn===true) return false; return BC._playerTurn; } }catch(e){} return null; }
  function isAttack(ab){ try{ var e=ab._data&&ab._data.effects; return !!(e&&e.attack>0); }catch(x){ return false; } }
  var noAtk=0, lastForce=0, forceCount=0;
  function forceWin(){ var cb=window.__curBattle; if(!cb||typeof cb.forceWinBattle!=="function") return false;
    var now=Date.now(); if(now-lastForce<1500) return false; lastForce=now; forceCount++;
    try{ cb.forceWinBattle(); L("force-win #"+forceCount); return true; }catch(e){ L("forceWin err "+(e&&e.message)); return false; } }
  function fireCard(){
    var h=hud(); if(!h||!h._currMon||typeof h._currMon.getCurrHand!=="function") return false;
    if(myTurn()!==true) return false;
    var hand; try{ hand=h._currMon.getCurrHand(); }catch(e){ return false; }
    if(!hand||!hand.length) return false;
    var btns=h._abilBtns||[], pick=-1, any=-1;
    for(var i=0;i<hand.length;i++){ var ab=hand[i];
      if(!ab||typeof ab.handleBtn!=="function"||btns[i]==null) continue;
      var cd=false; try{ cd=ab.inCooldown&&ab.inCooldown(); }catch(e){}
      if(cd) continue;
      if(any<0) any=i;
      if(pick<0&&isAttack(ab)) pick=i; }
    if(pick<0){ noAtk++; if(noAtk<3||any<0) return false; pick=any; L("no attack card playable, using card "+pick); }
    noAtk=0;
    var a=hand[pick]; try{ a._showingTooltip=false; a.handleBtn({type:"BUTTON_ACT_EVENT"}); return true; }catch(e){ L("fire err "+(e&&e.message)); return false; } }

  /* ---------- dialogs ---------- */
  var lastDlg=null, lastDlgT=0, dlgTries=0;
  function skipDialog(){
    var d=find(function(o){ return typeof o.forceFinishDialog==="function"&&o._dialogData; },true);
    if(!d){ lastDlg=null; return false; }
    var now=Date.now(); if(d!==lastDlg){ lastDlg=d; dlgTries=0; lastDlgT=0; }
    if(now-lastDlgT<350) return true;
    lastDlgT=now; dlgTries++;
    try{ if(dlgTries<=4) d.forceFinishDialog(); else if(typeof d.finishDialog==="function") d.finishDialog(true); else if(typeof d.closeDialog==="function") d.closeDialog(); }catch(e){ L("dialog err "+(e&&e.message)); }
    if(dlgTries>8) clickLabels(["TAP TO CONTINUE","NEXT","OK"]);
    return true; }

  /* ---------- map / nodes ---------- */
  function mapScreen(){ return find(function(o){ return typeof o.enterNode==="function"&&typeof o.handleGotoNode==="function"&&o._nodes&&o._nodes.h; },false); }
  function isDone(cid){ try{ var g=GS(); return !!(cid&&g&&g.isCompletedID(cid)); }catch(e){ return false; } }
  function arenaQuest(sp){
    try{ var t=((sp.hint||"")+" "+(sp.desc||"")).toUpperCase(), f=String(sp.stateFlagOnOpen||"").toLowerCase(), it=String(sp.req_item||"").toLowerCase();
      if(t.indexOf("ONLINE")>=0&&t.indexOf("ARENA")>=0) return true;
      if(f.indexOf("pvp")===0||it.indexOf("pvp")===0||it.indexOf("arena")>=0) return true; }catch(e){} return false; }
  var skip={}, cur=null, emptyTicks=0, doneCount=0, noted={};
  function note(id,msg){ if(noted[id]) return; noted[id]=1; L("skip node "+id+": "+msg); var A=API(); if(A) A.toast("Auto World skipped node "+id+": "+msg,"warn"); }
  function needsManual(){ return false; }
  function pathLen(map,id){ try{ var p=map._nodeMesh.calcPath(map._avatarPos,id); return p&&p.length!=null?p.length:9999; }catch(e){ return 9999; } }
  function candidates(map){
    var out=[], H=map._nodes.h;
    for(var id in H){ var n=H[id]; if(!n) continue; var t,sp,act;
      try{ t=n.getType(); act=n.isActionable(); sp=n.getCurrSpecData()||{}; }catch(e){ continue; }
      if(t!=="boss"&&t!=="quest") continue;
      if(!act||skip[id]) continue;
      if(isDone(sp.completionID)) continue;
      if(needsManual(id,sp,t)) continue;
      if(t==="quest"&&(arenaQuest(sp)||!(sp.req_item||sp.req_dynadex))) continue;
      out.push({n:n,id:+id,len:pathLen(map,+id),t:t}); }
    out.sort(function(a,b){ return (a.len-b.len)||(a.id-b.id); });
    return out; }

  function healTeam(map){
    try{ var g=GS(), ms=g&&g.getPlayerMons&&g.getPlayerMons(true), hurt=false;
      if(ms) for(var i=0;i<ms.length;i++){ if(ms[i].getCurrHP()<ms[i].getTotalHP()){ hurt=true; break; } }
      if(hurt&&typeof map.healAll==="function"){ map.healAll(); L("team healed"); } }catch(e){ L("heal err "+(e&&e.message)); } }
  function addReqItems(sp){
    var g=GS(); if(!g||!sp||!sp.req_item) return;
    var amt=(sp.req_amount|0)||1;
    String(sp.req_item).split("#").forEach(function(id){ if(!id) return;
      try{ if(id==="coins"){ if(g.getPlayerCoins()<amt) g.setPlayerCoins(amt); }
        else if((g.getItemAmount(id)|0)<amt){ g.setItemAmount(id,amt); L("item "+id+" -> "+amt); } }catch(e){ L("item err "+id); } }); }

  /* ----- team requirement (enter_quest): borrow a qualifying team, give the old one back afterwards ----- */
  function reqFit(m,r){ try{
    if(r.type&&m.getKind()!==r.type) return false;
    if(r.level&&m.getLevel()<(r.level|0)) return false;
    if(r.mon&&m.getId()!==r.mon) return false;
    if(r.notLegendary&&m.isLegendary()) return false;
    return true; }catch(e){ return false; } }
  function planTeam(sp){
    var g=GS(), q=sp.enter_quest, reqs=(q&&q.req)?q.req.slice():[];
    if(q&&q.previousTeam){ try{ reqs=g.getPreviousTeam().filter(Boolean).map(function(id){ return {mon:id}; }); }catch(e){} }
    if(!reqs.length) return null;
    var party=g.getParty().slice(), pool=g.getPlayerMons(true)||[];
    function score(m){ var pi=party.indexOf(m); return (pi>=0?1000:0)+m.getLevel(); }
    var order=reqs.map(function(r,i){ return i; }).sort(function(a,b){ var A=reqs[a],B=reqs[b]; return (!!B.mon-!!A.mon)||(!!B.type+!!B.level-!!A.type-!!A.level); });
    var used={}, pick=[];
    function dfs(k){ if(k>=order.length) return true; var r=reqs[order[k]];
      var cs=pool.filter(function(m){ return !used[m.getUid()]&&reqFit(m,r); }).sort(function(a,b){ return score(b)-score(a); });
      for(var c=0;c<cs.length&&c<6;c++){ used[cs[c].getUid()]=1; pick[order[k]]=cs[c]; if(dfs(k+1)) return true; used[cs[c].getUid()]=0; }
      return false; }
    if(!dfs(0)) return false;
    var already=pick.every(function(m){ return party.indexOf(m)>=0; });
    if(already) return null;
    var rest=party.filter(function(m){ return !used[m.getUid()]; }), next=pick.concat(rest).slice(0,Math.max(4,party.length));
    var snap={uids:party.map(function(m){ return m.getUid(); })};
    try{ applyParty(g,next); L("team borrowed for requirement: "+next.map(function(m){ return m.getId()+" L"+m.getLevel(); }).join(", ")); }catch(e){ L("team swap err "+(e&&e.message)); return false; }
    return snap; }
  function applyParty(g,list){
    g.setMonsToPartyPosition(list.slice(0,4).map(function(m,i){ return {position:i,mon:m}; }));
    var P=g.getParty(); for(var i=4;i<list.length;i++) P[i]=list[i]; P.length=list.length; }
  function restoreTeam(snap){
    if(!snap) return;
    try{ var g=GS(), ms=g.getMonsByUids(snap.uids), by={}; ms.forEach(function(m){ by[m.getUid()]=m; });
      var list=[]; snap.uids.forEach(function(u){ if(by[u]) list.push(by[u]); });
      if(list.length){ applyParty(g,list); L("original team restored"); } }catch(e){ L("restore err "+(e&&e.message)); } }
  var pendingSnap=null;
  function restoreWhenSafe(snap){
    if(!snap) return; pendingSnap=snap; var tries=0;
    (function again(){ if(!pendingSnap) return; if(hud()&&tries++<60){ setTimeout(again,2000); return; } restoreTeam(pendingSnap); pendingSnap=null; })(); }

  function wrapFight(map){
    if(map.__awWrapped||typeof map.gotoFight!=="function") return; map.__awWrapped=true;
    var og=map.gotoFight;
    map.gotoFight=function(node,b){
      try{ var spx=node.getCurrSpecData&&node.getCurrSpecData(); if(on&&node&&node.getType&&node.getType()==="boss"&&!(spx&&(spx.monAsPhase||spx.immortal||spx.specialCatch||spx.battleScenario))&&node._enemMons&&node._enemMons.length>1){ node._enemMons=node._enemMons.slice(0,1); L("boss team trimmed to 1 mon"); } }catch(e){}
      return og.apply(this,arguments); }; }

  /* quest: make sure the items exist, then press the modal's give button */
  function giveQuest(modal,node){
    var sp=node.getCurrSpecData()||{}; if(!GS()) return false;
    addReqItems(sp);
    try{ if(modal._giveBtn&&typeof modal._giveBtn.act==="function"){ modal._giveBtn.act(); return true; } }catch(e){ L("give err "+(e&&e.message)); }
    return false; }

  /* ---------- lock: god + one-hit + 4x speed while ON ---------- */
  function lock(){ var A=API(); if(!A) return;
    if(!A.F.god) A.set("god",true);
    if(!A.F.oneHit) A.set("oneHit",true);
    if(!A.F.noCD) A.set("noCD",true);
    try{ if(A.getSpeed()!==4) A.setSpeed(4); }catch(e){} }

  /* ---------- main tick ---------- */
  var on=false, timer=null, prev=null, lastMapName="", startedAt=0, endedAt=0, bossDone=0, questDone=0, lastLeft=0;
  function stop(why){
    window.__DG_AW_PAUSED=false;
    if(!on) return; on=false; endedAt=Date.now(); if(why==="world complete") lastLeft=0; if(timer){ clearTimeout(timer); timer=null; }
    var A=API(); if(A){ try{ if(prev){ A.set("god",prev.god); A.set("oneHit",prev.oneHit); A.set("noCD",prev.noCD); A.setSpeed(prev.speed); } A.set("autoWorld",false); A.toast("Auto World OFF - "+why, why==="world complete"?"ok":"warn"); }catch(e){} }
    L("STOP: "+why+" (done "+doneCount+")"); if(cur&&cur.snap) restoreWhenSafe(cur.snap); cur=null; }
  function progress(){ if(cur) cur.t0=Date.now(); }
  var battleSince=0;
  function tick(){
    if(!on) return; if(window.__DG_AW_PAUSED){timer=setTimeout(tick,350);return;} var delay=350;
    try{
      lock();
      if(skipDialog()){ progress(); delay=250; }
      else if(clickLabels(RESULT_LABELS)){ progress(); delay=400; }
      else if(hud()){ progress(); if(!battleSince) battleSince=Date.now();
        if(Date.now()-battleSince>120000){ stop("stuck in a fight (node "+(cur?cur.id:"?")+") - finish it by hand"); return; }
        if(cur&&cur.force&&forceCount<15){ delay=forceWin()?400:200; } else { delay=fireCard()?200:150; } }
      else { battleSince=0; forceCount=0; delay=mapStep(); }
    }catch(e){ L("tick err "+(e&&e.message)); }
    if(on) timer=setTimeout(tick,delay); }

  function mapStep(){
    var map=mapScreen(); if(!map) return 500;
    wrapFight(map);
    if(map._mapId&&map._mapId!==lastMapName){ lastMapName=map._mapId; L("world: "+lastMapName); var A=API(); if(A) A.toast("Auto World: "+String(lastMapName).toUpperCase(),"ok"); }
    /* modals on the map */
    var ml=map._modalLayer, mk=ml&&kids(ml), i;
    if(mk) for(i=0;i<mk.length;i++){ var c=mk[i];
      if(c&&c._giveBtn){ if(cur&&giveQuest(c,cur.n)){ cur.gave=true; progress(); } else if(cur&&Date.now()-cur.t0>20000){ L("quest modal stuck, skipping node "+cur.id); skip[cur.id]=1; clickLabels(["CLOSE","BACK"]); restoreTeam(cur.snap); cur=null; } return 600; }
      if(c&&typeof c.getNode==="function"){ try{ map.handleEnemyFight({target:c}); cur&&progress(); }catch(e){ L("fight start err "+(e&&e.message)); } return 500; } }
    if(mk&&mk.length>0&&cur){ /* unknown modal */ if(Date.now()-cur.t0>15000){ clickLabels(["CLOSE","OK","BACK"]); } return 600; }
    /* track current target */
    if(cur){
      var sp=cur.n.getCurrSpecData()||{};
      if(isDone(sp.completionID)){ L("done node "+cur.id+" ("+cur.t+")"); doneCount++; if(cur.t==="boss") bossDone++; else questDone++; if(lastLeft>0) lastLeft--; restoreTeam(cur.snap); cur=null; emptyTicks=0; return 300; }
      var age=Date.now()-cur.t0;
      if(age>120000){ L("timeout node "+cur.id+", skipping"); skip[cur.id]=1; restoreTeam(cur.snap); cur=null; return 300; }
      if(map._avatarPos!==cur.lastPos){ cur.lastPos=map._avatarPos; cur.moveT=Date.now(); }
      if(map._avatarPos!==cur.id&&Date.now()-cur.moveT>5000){
        if((cur.tries|0)>=10){ note(cur.id,"cannot reach it (walk keeps getting interrupted)"); skip[cur.id]=1; restoreTeam(cur.snap); cur=null; return 300; }
        cur.tries=(cur.tries|0)+1; healTeam(map); L("re-sending walk to "+cur.id+" (try "+cur.tries+")");
        try{ map.handleGotoNode({target:cur.n}); }catch(e){ L("goto err "+(e&&e.message)); }
        cur.moveT=Date.now(); return 600; }
      if(map._avatarPos===cur.id){
        if(!cur.arrived){ cur.arrived=Date.now(); return 400; }
        if(Date.now()-Math.max(cur.arrived,cur.t0)>5000&&!cur.entered){ cur.entered=true;
          try{ if(cur.t==="boss") map.startFightAt(cur.n); else map.enterNode(); }catch(e){ L("enter err "+(e&&e.message)); } }
        else if(Date.now()-Math.max(cur.arrived,cur.t0)>12000&&cur.entered&&!cur.retried){ cur.retried=true; cur.entered=false; cur.arrived=Date.now(); L("retry enter "+cur.id); }
      }
      return 500; }
    /* pick next */
    var list=candidates(map);
    if(!list.length){ emptyTicks++; if(emptyTicks>=4){ stop("world complete"); } return 500; }
    emptyTicks=0; var pick=list[0]; lastLeft=list.length;
    var sp0=pick.n.getCurrSpecData()||{}, snap=null, force=false;
    if(pick.t==="boss"){
      addReqItems(sp0);
      force=!!(sp0.immortal||sp0.specialCatch||sp0.battleScenario);
      if(sp0.enter_quest){ var pl=planTeam(sp0); if(pl===false){ note(pick.id,"no Dynamons meet the team requirement"); skip[pick.id]=1; return 300; } snap=pl; } }
    cur={n:pick.n,id:pick.id,t:pick.t,t0:Date.now(),moveT:Date.now(),lastPos:map._avatarPos,tries:0,force:force,snap:snap};
    healTeam(map);
    L("next -> "+pick.t+" node "+pick.id+" (path "+pick.len+", "+list.length+" left)");
    try{ map.handleGotoNode({target:pick.n}); }catch(e){ L("goto err "+(e&&e.message)); skip[pick.id]=1; restoreTeam(snap); cur=null; }
    return 500; }

  window.__DG_autoWorld=function(want){
    var A=API(); if(!A){ L("menu API missing"); return; }
    if(!want){ stop("manual"); return; }
    if(on) return;
    if(!GS()){ A.set("autoWorld",false); A.toast("Game not ready","err"); return; }
    window.__DG_AW_PAUSED=false;forceCount=0; on=true; startedAt=Date.now(); endedAt=0; bossDone=0; questDone=0; lastLeft=0; skip={}; noted={}; battleSince=0; cur=null; emptyTicks=0; doneCount=0; lastMapName=""; noAtk=0;
    prev={god:!!A.F.god,oneHit:!!A.F.oneHit,noCD:!!A.F.noCD,speed:A.getSpeed()};
    try{ A.hookAll(); }catch(e){}
    lock(); L("START"); A.toast("Auto World ON","ok");
    tick(); };
  var pauseStart=0;
  window.__DG_awPause=function(want){
    if(!on)return;
    if(want&&!window.__DG_AW_PAUSED){pauseStart=Date.now();window.__DG_AW_PAUSED=true;}
    else if(!want&&window.__DG_AW_PAUSED){var dt=Date.now()-pauseStart;startedAt+=dt;if(battleSince)battleSince+=dt;
      if(cur){cur.t0+=dt;cur.moveT+=dt;if(cur.arrived)cur.arrived+=dt;}window.__DG_AW_PAUSED=false;}
  };
  window.__DG_autoWorldStatus=function(){
    var pct=null; try{ var g=GS(); if(g&&lastMapName&&typeof g.getMapPercComplete==="function"){ var v=+g.getMapPercComplete(lastMapName); if(isFinite(v)) pct=Math.max(0,Math.min(100,Math.round(v<=1?v*100:v))); } }catch(e){}
    var el=startedAt?((on?(window.__DG_AW_PAUSED?pauseStart:Date.now()):endedAt)-startedAt):0, avg=doneCount?el/doneCount:0;
    return {on:on,paused:!!window.__DG_AW_PAUSED,map:lastMapName,pct:pct,bosses:bossDone,quests:questDone,skipped:Object.keys(skip).length,skippedIds:Object.keys(skip),
      left:lastLeft,elapsed:el,eta:(on&&avg&&lastLeft)?Math.round(avg*lastLeft):null,cur:cur?cur.id:null,curType:cur?cur.t:null,done:doneCount,log:LOG.slice(-30)}; };
})();

;/* ============================================================
   DG SKIN PACKS v1 - generic art/name pack loader
   A pack lives in the public Supabase bucket "skin-packs":
     <pack>/manifest.json   {"title":"..","names":{"monId":"New Name"},"mons":{"monId":["front","back","icon","shape"]}}
     <pack>/<monId>/front.png | back.png | icon.png | shape.png
   Only files listed in the manifest are ever swapped. Restart the game to apply.
   ============================================================ */
(function(){
  "use strict";
  if(window.__DG_SKIN_LOADED) return; window.__DG_SKIN_LOADED=true;
  var BASE="https://dfxcpxzylyycrirtnkof.supabase.co/storage/v1/object/public/skin-packs", KEY="__DG_SKIN";
  function rd(){ try{ var o=JSON.parse(localStorage.getItem(KEY)||"{}"); return (o&&typeof o==="object")?o:{}; }catch(e){ return {}; } }
  function wr(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
  var S=rd(); S.enabled=S.enabled||{}; S.have=S.have||{}; S.names=S.names||{};
  var RE=/images\/general\/mons\/([a-z0-9_]+)\/(front|back|icon|shape)\.png(?:\?.*)?$/i;
  function swap(url){
    try{ if(!S.pack||typeof url!=="string"||navigator.onLine===false) return null;
      var m=RE.exec(url); if(!m||!S.enabled[m[1]]||!S.have[m[1]+"/"+m[2]]) return null;
      return BASE+"/"+encodeURIComponent(S.pack)+"/"+m[1]+"/"+m[2]+".png"; }catch(e){ return null; } }

  /* ---- image loads: rewrite the URL of listed mon art only ---- */
  try{ var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");
    if(d&&d.set&&d.get&&Object.keys(S.enabled).length){
      Object.defineProperty(HTMLImageElement.prototype,"src",{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){
        var u=swap(v); if(u){ try{ this.crossOrigin="anonymous"; }catch(e){} return d.set.call(this,u); } return d.set.call(this,v); }}); } }catch(e){}
  try{ var xo=XMLHttpRequest.prototype.open;
    if(Object.keys(S.enabled).length) XMLHttpRequest.prototype.open=function(m,u){ var a=arguments, n=swap(u); if(n){ a=[].slice.call(arguments); a[1]=n; } return xo.apply(this,a); }; }catch(e){}

  /* ---- names: set the title of each enabled monster once game data exists ---- */
  (function(){ var tries=0, t=setInterval(function(){
    if(++tries>240){ clearInterval(t); return; }
    try{ var r=window.$DW||window.$hxClasses, db=r&&r["co.doubleduck.dynamons3.data.GameplayDB"], all=db&&db.getAllMons&&db.getAllMons();
      if(!all||!all.length) return; clearInterval(t);
      all.forEach(function(m){ var n=S.names[m.id]; if(n&&S.enabled[m.id]) m.title=n; }); }catch(e){} },500); })();

  var FILES=["front","back","icon","shape"], IDRE=/^[a-z0-9_]+$/;
  /* tolerant manifest reader: mons may be {id:[files]}, {id:true}, [ids], or missing (then the names list is used) */
  function parseManifest(j){
    j=j||{}; var mons={}, names={}, have={}, src=j.mons, nm=j.names||{};
    function put(id,files){ id=String(id).toLowerCase(); if(!IDRE.test(id)) return; var f=(files||FILES).filter(function(x){ return FILES.indexOf(x)>=0; }); mons[id]=f.length?f:FILES.slice(); }
    if(Array.isArray(src)) src.forEach(function(id){ put(id); });
    else if(src&&typeof src==="object") Object.keys(src).forEach(function(id){ put(id,Array.isArray(src[id])?src[id]:null); });
    Object.keys(nm).forEach(function(id){ var k=String(id).toLowerCase(); if(!IDRE.test(k)) return; names[k]=String(nm[id]).slice(0,40); if(!mons[k]) put(k); });
    Object.keys(mons).forEach(function(id){ mons[id].forEach(function(f){ have[id+"/"+f]=1; }); });
    return {mons:mons,names:names,have:have,title:j.title}; }
  window.__DG_parseManifest=parseManifest;

  /* ---- the menu tab ---- */
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
  window.__DG_buildSkinTab=function(body,H){
    var mk=H.mk, B=H.B, toast=H.toast;
    body.appendChild(mk("div",{class:"dw_grouphdr",text:"SKIN PACKS"}));
    body.appendChild(mk("div",{class:"dw_note",text:"Load a pack from your skin-packs storage, pick which Dynamons use it, then restart the game to apply."}));
    var row=mk("div",{class:"dw_field"}); row.appendChild(mk("label",{text:"Pack"}));
    var inp=mk("input",{class:"dw_inp wide",type:"text",placeholder:"pack id (folder name)",autocomplete:"off",value:S.pack||"mypack"}); row.appendChild(inp);
    var list=mk("div",{class:"dw_list tall"});
    row.appendChild(B("Load",function(){ load(inp.value.trim()); },"go")); body.appendChild(row);
    var q=mk("div",{class:"dw_quick"});
    q.appendChild(B("Apply to all",function(){ if(!S.pack){ toast("Load a pack first","warn"); return; } Object.keys(S.mons||{}).forEach(function(id){ S.enabled[id]=1; }); wr(); draw(); H.showRestart&&H.showRestart("Skins saved. Restart the game to apply."); },"chip gold"));
    q.appendChild(B("Reset all",function(){ S.enabled={}; wr(); draw(); H.showRestart&&H.showRestart("Original art restored after restart."); },"chip"));
    body.appendChild(q); body.appendChild(list);
    function draw(){ list.innerHTML="";
      var ids=Object.keys(S.mons||{}).sort();
      if(!ids.length){ list.appendChild(mk("div",{class:"dw_note",text:S.pack?"This pack has no Dynamons listed.":"No pack loaded yet."})); return; }
      ids.forEach(function(id){
        var r=mk("div",{class:"dw_tg"}), img=document.createElement("img"); img.src=BASE+"/"+encodeURIComponent(S.pack)+"/"+id+"/icon.png"; img.style.cssText="width:34px;height:34px;object-fit:contain;border-radius:8px;flex:none;background:rgba(255,255,255,.05)"; img.onerror=function(){ img.style.visibility="hidden"; };
        r.appendChild(img); r.appendChild(mk("div",{class:"dw_tglab",text:(S.names[id]||id)+(S.names[id]?"  ("+id+")":"")}));
        var sw=mk("div",{class:"dw_sw"+(S.enabled[id]?" on":"")},[mk("div",{class:"dw_knob"})]);
        sw.onclick=function(){ if(S.enabled[id]) delete S.enabled[id]; else S.enabled[id]=1; wr(); sw.className="dw_sw"+(S.enabled[id]?" on":""); toast((S.names[id]||id)+(S.enabled[id]?" skin ON":" skin OFF")+" - restart to apply","ok"); };
        r.appendChild(sw); list.appendChild(r); }); }
    function load(pack){
      if(!pack){ toast("Enter a pack id","warn"); return; }
      toast("Loading pack...","ok");
      fetch(BASE+"/"+encodeURIComponent(pack)+"/manifest.json?_="+Date.now(),{cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error("none"); return r.json(); }).then(function(j){
        var P=parseManifest(j), mons=P.mons, have=P.have, names=P.names;
        if(S.pack!==pack) S.enabled={};
        S.pack=pack; S.mons=mons; S.have=have; S.names=names; wr(); draw(); toast("Pack loaded: "+esc(j.title||pack),"ok");
      }).catch(function(){ toast("Pack not found. Upload "+pack+"/manifest.json first","err"); }); }
    draw(); if(!Object.keys(S.mons||{}).length) load(inp.value.trim()||"mypack"); };
})();

}
(function(){
  'use strict';
  if(window.__DG_NATIVE)return;
  var registry=window.$DW||window.$hxClasses;
  if(!registry||!window.__DG_API)return;
  function cls(n){return (window.$DW||window.$hxClasses||{})['co.doubleduck.dynamons3.'+n];}
  function gs(){return cls('meta.GameState');}
  function db(){return cls('data.GameplayDB');}
  function api(){return window.__DG_API;}
  function flag(k){return !!api().F[k];}
  function locks(){return window.__DG_LOCKS||{};}
  function locked(k){var l=locks();return l.app===true||l.mods===true||l[k]===true||(k.indexOf('unlock')===0&&l.unlock===true);}
  function requireOpen(k){if(locked(k))throw Error('This feature is currently unavailable.');}
  function number(n,min,max){n=Number(n);if(!isFinite(n)||n<min||n>max)throw Error('Enter a value from '+min+' to '+max);return n;}
  function invoke(o,k,a){if(!o||typeof o[k]!=='function')throw Error('This game version does not support '+k);return o[k].apply(o,a||[]);}
  function save(){var I=window.__DG_NATIVE_INTERNAL;if(I){I.sync();I.save();}else{
    var keys=['statcap','maxdef','fullheal','pvpcd','itemtimer','turnreset','items5','nicklen','nickval','shopfix'];window.__DGF=window.__DGF||{};keys.forEach(function(k){window.__DGF[k]=k==='shopfix'?true:flag(k);});
    if(api().F.saveSettings!==false){var values={};Object.keys(api().F).forEach(function(k){if(k!=='autoWorld'&&k!=='autoGrind'&&k!=='saveSettings')values[k]=!!api().F[k];});try{localStorage.setItem('__DG_F_v2',JSON.stringify({version:2,values:values}));}catch(e){}}
  }}
  var EMBED_SKINS=(window.__DG_CATALOG||{}).skins||[];
  var EMBED_EMOTES=(window.__DG_CATALOG||{}).emotes||[];
  var EMBED_AVATARS=(window.__DG_CATALOG||{}).avatars||[];
  var grindPrevious=null,scanMons=[],scanToken='',scanBattle=null;
  function stopGrind(){if(window.__DG_grind)window.__DG_grind(false);api().F.autoGrind=false;
    if(grindPrevious){Object.keys(grindPrevious).forEach(function(k){api().set(k,locked(k)?false:grindPrevious[k]);});grindPrevious=null;}
    window.__DG_FORCEBOT=flag('botMatch');save();}
  function setFlag(k,on){if(!Object.prototype.hasOwnProperty.call(api().F,k))throw Error('Unknown feature');
    if(k==='shopfix'){api().set(k,true);save();return;}
    if(k==='botMatch'&&window.__DG_matchActive&&window.__DG_matchActive()&&on!==flag(k))throw Error('Bot matchmaking is locked until this match ends');
    if(k==='autoGrind'&&on&&!flag(k)&&window.__DG_matchActive&&window.__DG_matchActive())throw Error('Start Arena automation between matches');
    requireOpen(k);
    if(flag('autoWorld')&&['god','oneHit','noCD'].indexOf(k)>=0)throw Error('Stop Auto World before changing this control');
    if(k==='autoGrind'){
      if(on){if(flag('autoWorld'))throw Error('Stop Auto World before starting arena automation');['botMatch','god','oneHit'].forEach(requireOpen);
        if(!window.__DG_grind)throw Error('Arena automation is unavailable');
        if(!flag('autoGrind')){grindPrevious={botMatch:flag('botMatch'),god:flag('god'),oneHit:flag('oneHit')};}
        ['botMatch','god','oneHit','autoGrind'].forEach(function(x){api().set(x,true);});window.__DG_grind(true);
      }else stopGrind();
    }else if(k==='autoWorld'){
      if(on){if(flag('autoGrind'))throw Error('Stop arena automation first');['god','oneHit','noCD','speed'].forEach(requireOpen);}
      if(!window.__DG_autoWorld)throw Error('World automation is unavailable');api().set(k,on);window.__DG_autoWorld(on);
    }else{api().set(k,on);if(k==='botMatch')window.__DG_FORCEBOT=on;}
    save();
  }
  // Locks apply to every feature, including controls on pages never opened.
  function enforceLocks(){
    var F=api().F,L=locks(),changed=false;
    if(F.autoWorld&&(['autoWorld','god','oneHit','noCD','speed'].some(locked))){if(window.__DG_autoWorld)window.__DG_autoWorld(false);F.autoWorld=false;changed=true;}
    if(F.autoGrind&&(['autoGrind','botMatch','god','oneHit'].some(locked)))stopGrind();
    Object.keys(F).forEach(function(k){if(k!=='shopfix'&&locked(k)&&F[k]){F[k]=false;changed=true;}});F.shopfix=true;window.__DG_FORCEBOT=!!F.botMatch;if(changed)save();
  }
  function items(){var D=db(),suits={},mons={};invoke(D,'getAllSuits').forEach(function(x){suits[x.id]=true;});invoke(D,'getAllMons').forEach(function(x){mons[x.id]=true;});
    return invoke(D,'getAllItems').filter(function(x){var id=x.id;if(!id||id==='inferno_suit'||/^(mon#|emote#|video_counter#)/.test(id))return false;
      if(['ice_suit','diamond_suit','inferno_armor','spirit_armor'].indexOf(id)>=0)return true;
      return !suits[id]&&!mons[id]&&!/(pack|_egg|no_ads|unlock_all_worlds|golden_dynamons|all_dynamons|ultimate|_offer|_deal|emoticons|_skin|_halloween|_snow|_ultra|_angry|_neon|_awakened|_christmas|battle_speed|auto_heal)/i.test(id);
    });}
  function itemImage(x){
    var special={inferno_armor:'images/general/char_icons/inferno_icon.png',spirit_armor:'images/general/char_icons/spirit_suit_icon.png',ice_suit:'images/general/char_icons/ice_suit_icon.png',diamond_suit:'images/general/char_icons/diamond_suit_icon.png',guardian_skull_king:'images/general/mons/guardian_skull_king/icon.png'};
    var icon=String(x.icon||x.id||'');return special[x.id]||(/^[A-Za-z0-9_-]+$/.test(icon)?'images/items/icons/'+icon+'.png':'');
  }
  function exportControls(){
    var g=gs(),values={};Object.keys(api().F).forEach(function(k){values[k]=!!api().F[k];});
    var skin={};try{skin=JSON.parse(localStorage.getItem('__DG_SKIN')||'{}');}catch(e){}
    return {flags:values,speed:api().getSpeed(),coins:invoke(g,'getPlayerCoins'),dust:invoke(g,'getPlayerDust'),party:invoke(g,'getParty').filter(Boolean).length,
      items:items().map(function(x){return {id:x.id,amount:invoke(g,'getItemAmount',[x.id])||0};}),skin:skin};
  }
  function restoreControls(c){
    if(!c||typeof c!=='object'||!c.flags||typeof c.flags!=='object')throw Error('Invalid controls file');
    var F=api().F,known={},g=gs(),flags=c.flags;
    items().forEach(function(x){known[x.id]=true;});
    Object.keys(flags).forEach(function(k){if(!Object.prototype.hasOwnProperty.call(F,k)||typeof flags[k]!=='boolean')throw Error('Unsupported saved feature');if(k==='botMatch'&&window.__DG_matchActive&&window.__DG_matchActive()&&flags[k]!==flag(k))throw Error('Bot matchmaking is locked until this match ends');if(flags[k]&&k!=='shopfix'&&k!=='autoWorld'&&k!=='autoGrind')requireOpen(k);});
    requireOpen('speed');number(c.speed,.1,8);if(!window.$DG||!window.$DG.applySpeed)throw Error('Speed patch is missing');
    requireOpen('setCoins');requireOpen('setDust');number(c.coins,0,999999999);number(c.dust,0,999999999);
    requireOpen('party');var count=Math.round(number(c.party,3,5));if(invoke(g,'getPlayerMons',[true]).filter(Boolean).length<count)throw Error('You do not own enough Dynamons for this backup');
    if(!Array.isArray(c.items)||c.items.length>4096)throw Error('Invalid item backup');
    requireOpen('items');var seen={};c.items.forEach(function(x){if(!x||!known[x.id]||seen[x.id])throw Error('Saved item is unavailable');seen[x.id]=true;number(x.amount,0,999999);});
    var skin=c.skin||{};requireOpen('skins');
    if(skin.pack){if(!/^[A-Za-z0-9_-]{1,64}$/.test(skin.pack)||!skin.mons||typeof skin.mons!=='object'||!skin.enabled||typeof skin.enabled!=='object')throw Error('Invalid skin backup');
      if(JSON.stringify(skin).length>500000)throw Error('Skin backup is too large');
      Object.keys(skin.mons).forEach(function(id){if(!/^[a-z0-9_]+$/.test(id))throw Error('Invalid skin ID');});
      Object.keys(skin.enabled).forEach(function(id){if(!Object.prototype.hasOwnProperty.call(skin.mons,id))throw Error('Unknown selected skin');});
    }
    // Validate the whole file and every remote lock before any mutation.
    if(window.__DG_autoWorld)window.__DG_autoWorld(false);F.autoWorld=false;stopGrind();
    Object.keys(flags).forEach(function(k){if(k!=='autoWorld'&&k!=='autoGrind'){if(locked(k)&&!flags[k]){api().set(k,false);}else setFlag(k,flags[k]);}});
    api().setSpeed(Number(c.speed));invoke(g,'setPlayerCoins',[Math.round(c.coins)]);invoke(g,'setPlayerDust',[Math.round(c.dust)]);
    c.items.forEach(function(x){invoke(g,'setItemAmount',[x.id,Math.round(x.amount)]);});
    var result=window.__DG_NATIVE.command('party',{value:count});if(!result.ok)throw Error(result.error);
    if(skin.pack)localStorage.setItem('__DG_SKIN',JSON.stringify(skin));else localStorage.removeItem('__DG_SKIN');save();
  }
  function team(){var g=gs(),b=window.__curBattle,mine=invoke(g,'getParty').filter(Boolean),foe=[];
    if(b&&b._selfMon&&mine.indexOf(b._selfMon)<0)mine.unshift(b._selfMon);if(b&&b._enemyMon)foe.push(b._enemyMon);
    return {mine:mine,foe:foe};}
  function skinConfig(a){var pack=String(a.pack||'');if(!/^[A-Za-z0-9_-]{1,64}$/.test(pack))throw Error('Use a valid pack folder name');
    var j=a.manifest;if(!j||!window.__DG_parseManifest)throw Error('Load a valid manifest first');var P=window.__DG_parseManifest(j),enabled={};
    (a.enabled||[]).forEach(function(id){if(P.mons[id])enabled[id]=1;});
    localStorage.setItem('__DG_SKIN',JSON.stringify({pack:pack,mons:P.mons,have:P.have,names:P.names,enabled:enabled}));
  }
  window.__DG_NATIVE={snapshot:function(){try{
    enforceLocks();var g=gs(),A=api(),F={},skin={};try{skin=JSON.parse(localStorage.getItem('__DG_SKIN')||'{}');}catch(e){};Object.keys(A.F).forEach(function(k){F[k]=!!A.F[k];});
    return {ok:true,ready:!!g,coins:invoke(g,'getPlayerCoins'),dust:invoke(g,'getPlayerDust'),speed:A.getSpeed(),flags:F,locks:locks(),party:invoke(g,'getParty').filter(Boolean).length,
      world:window.__DG_autoWorldStatus?window.__DG_autoWorldStatus():{},grind:{on:!!window.__DG_GRIND,paused:!!window.__DG_GRIND_PAUSED},skin:skin,notice:window.__DG_LAST_NOTICE||null,brand:window.__DG_BRAND||null,menuConfig:window.__DG_MENU_CONFIG||null};
  }catch(e){return {ok:false,ready:false,error:String(e.message||e)};}},command:function(name,a){try{
    if(!gs())throw Error('Game is not ready');a=a||{};var g=gs(),r={ok:true,message:'Applied'};
    if(name==='exportControls'){r.controls=exportControls();r.message='Controls collected';}
    else if(name==='restoreControls'){restoreControls(a.controls);r.message='All settings restored · automation stopped';}
    else if(name==='unlockAll'){['Mons','Skins','Emotes','Avatars'].forEach(function(k){requireOpen('unlock'+k);});var results=[];['Mons','Skins','Emotes','Avatars'].forEach(function(k){var x=window.__DG_NATIVE.command('unlock',{kind:k});if(!x.ok)throw Error(k+': '+x.error);results.push(x.message);});r.message='Collection, skins, emotes and avatars updated';}
    else if(name==='flag')setFlag(String(a.key),a.value===true);
    else if(name==='coins'||name==='dust'){requireOpen(name==='coins'?'setCoins':'setDust');var v=Math.round(number(a.value,0,999999999));invoke(g,name==='coins'?'setPlayerCoins':'setPlayerDust',[v]);r.value=invoke(g,name==='coins'?'getPlayerCoins':'getPlayerDust');}
    else if(name==='speed'){requireOpen('speed');if(flag('autoWorld'))throw Error('Auto World controls game speed');if(!window.$DG||!window.$DG.applySpeed)throw Error('Speed patch is missing');api().setSpeed(number(a.value,.1,8));r.value=api().getSpeed();}
    else if(name==='party'){requireOpen('party');var n=Math.round(number(a.value,3,5)),cur=invoke(g,'getParty').filter(Boolean),pool=invoke(g,'getPlayerMons',[true]);
      pool.filter(function(m){return cur.indexOf(m)<0;}).sort(function(x,y){return y.getLevel()-x.getLevel();}).forEach(function(m){if(cur.length<n)cur.push(m);});
      if(cur.length<n)throw Error('You do not own enough Dynamons');cur=cur.slice(0,n);invoke(g,'setMonsToPartyPosition',[cur.slice(0,4).map(function(m,i){return {position:i,mon:m};})]);var p=g.getParty();for(var i=4;i<cur.length;i++)p[i]=cur[i];p.length=cur.length;invoke(g,'saveMonsData');}
    else if(name==='items'){r.items=items().map(function(x){return {id:x.id,title:x.title||x.id,amount:invoke(g,'getItemAmount',[x.id])||0,image:itemImage(x)};});}
    else if(name==='item'){requireOpen('items');var id=String(a.id),exists=items().some(function(x){return x.id===id;});if(!exists)throw Error('Item is unavailable');invoke(g,'setItemAmount',[id,Math.round(number(a.value,0,999999))]);r.value=invoke(g,'getItemAmount',[id]);}
    else if(name==='allItems'){requireOpen('items');var amount=Math.round(number(a.value,0,999999));items().forEach(function(x){invoke(g,'setItemAmount',[x.id,amount]);});}
    else if(name==='scan'){var t=team();scanMons=t.mine.concat(t.foe);scanBattle=window.__curBattle;scanToken=String(Date.now())+'-'+Math.random();r.token=scanToken;r.mons=scanMons.map(function(m,i){var d=m.getData?m.getData():{};return {index:i,name:d.title||d.id||'Dynamon',side:i<t.mine.length?'Your team':'Enemy',hp:m.getCurrHP(),max:m.getTotalHP(),atk:m.getStat('atk'),def:m.getStat('def'),aim:m.getStat('aim')};});}
    else if(name==='stat'){requireOpen('teamEditor');if(a.token!==scanToken||scanBattle!==window.__curBattle)throw Error('Battle changed; scan again');var m=scanMons[a.index],current=team();if(!m||current.mine.concat(current.foe).indexOf(m)<0)throw Error('Team changed; scan again');var value=Math.round(number(a.value,0,1000000));if(a.stat==='hp'){if(value>m.getTotalHP())throw Error('HP exceeds this monster maximum');if(m.forceSetHP)m.forceSetHP(value);else invoke(m,'setCurrHP',[value]);}else if(['atk','def','aim'].indexOf(a.stat)>=0)invoke(m,'offsetStat',[a.stat,value-m.getStat(a.stat)]);else throw Error('Unknown stat');}
    else if(name==='unlock'){var kind=String(a.kind);requireOpen('unlock'+kind);var D=db(),I=g._playerItems&&g._playerItems.h;
      if(kind==='Mons'){var ids=invoke(D,'getAllMons').map(function(x){return x.id;}),all=g._capturedMons||[];ids.forEach(function(id){if(all.indexOf(id)<0)all.push(id);});g._capturedMons=all;var DK=cls('data.DataKey');invoke(g,'setString',[DK&&DK.CAPTURED_MONS||'CAPTURED_MONS',all.join(';')]);r.message=ids.length+' Dynamon collection entries unlocked';}
      else if(kind==='Skins'||kind==='Emotes'){if(!I)throw Error('Inventory is not ready');var ids=(kind==='Skins'?EMBED_SKINS:EMBED_EMOTES).slice();invoke(D,'getAllItems').forEach(function(x){if(kind==='Emotes'?/^emote#/.test(x.id):/skin/i.test(x.id)){if(ids.indexOf(x.id)<0)ids.push(x.id);}});ids.forEach(function(id){if(kind==='Skins'){var base=String(id).replace(/^skin#/,'');I[base]=1;I['skin#'+base]=1;}else I[/^emote#/.test(id)?id:'emote#'+id]=1;});invoke(g,'saveItems');r.message=ids.length+' inventory entries unlocked';}
      else if(kind==='Avatars'){var list=EMBED_AVATARS.slice();invoke(D,'getAllSuits').forEach(function(x){if(x.linkedIcon)list.push(x.linkedIcon);});list.forEach(function(id){invoke(g,'addAvatarBought',[id]);});r.message='Available suit avatars unlocked';}
      else throw Error('Unknown unlock category');}
    else if(name==='skinConfig'){requireOpen('skins');skinConfig(a);r.message='Skin selection saved. Restart the game to apply.';}
    else if(name==='resetSkins'){requireOpen('skins');localStorage.removeItem('__DG_SKIN');r.message='Original artwork restored after restart.';}
    else if(name==='pause'){var kind=String(a.kind);if(kind==='world'){if(!window.__DG_awPause)throw Error('Update the game payload to enable pause');window.__DG_awPause(a.value===true);}else{if(!window.__DG_grindPause)throw Error('Update the game payload to enable pause');window.__DG_grindPause(a.value===true);}r.message=a.value?'Automation paused':'Automation resumed';}
    else if(name==='skinState'){try{r.skin=JSON.parse(localStorage.getItem('__DG_SKIN')||'{}');}catch(e){r.skin={};}}
    else if(name==='stopAll'){if(window.__DG_autoWorld)window.__DG_autoWorld(false);api().F.autoWorld=false;stopGrind();r.message='Automation stopped';}
    else if(name==='profile'){var values=a.values||{};if(typeof values.botMatch==='boolean'&&window.__DG_matchActive&&window.__DG_matchActive()&&values.botMatch!==flag('botMatch'))throw Error('Bot matchmaking is locked until this match ends');Object.keys(values).forEach(function(k){if(k!=='shopfix'&&['autoWorld','autoGrind'].indexOf(k)<0&&Object.prototype.hasOwnProperty.call(api().F,k))requireOpen(k);});if(flag('autoWorld')||flag('autoGrind'))throw Error('Stop automation before applying a profile');Object.keys(values).forEach(function(k){if(['autoWorld','autoGrind'].indexOf(k)<0&&Object.prototype.hasOwnProperty.call(api().F,k))setFlag(k,values[k]===true);});}
    else throw Error('Unknown command');return r;
  }catch(e){return {ok:false,error:String(e.message||e)};}}};
  window.__DG_NATIVE_LOCK_TIMER=setInterval(function(){try{enforceLocks();}catch(e){}},1000);
  // Keep the legacy interface from competing with the native one. Gameplay hooks remain live.
  var st=document.getElementById('dg_native_hide');if(!st){st=document.createElement('style');st.id='dg_native_hide';st.textContent='#dw_panel,#dw_fab,#dw_toasts,#dw_restart{display:none!important}';(document.head||document.documentElement).appendChild(st);}
})();

};window.__DG_INSTALL_NATIVE();
/* Royal Void targeted repair. Append to the CURRENT protected runtime.
 * Keeps existing controls, hooks and automation. No network or key handling.
 */
(function () {
  'use strict';
  var revision = 'arena-worlds-party-max-3';
  function cls(name) {
    return (window.$DW || window.$hxClasses || {})['co.doubleduck.dynamons3.' + name];
  }
  function requireOpen(key) {
    var locks = window.__DG_LOCKS || {};
    if (locks.app || locks.mods || locks.unlock || locks[key]) {
      throw Error('This feature is currently unavailable.');
    }
  }
  function addMissingMons() {
    requireOpen('unlockMons');
    var game = cls('meta.GameState'), db = cls('data.GameplayDB'), Mon = cls('core.Mon');
    if (!game || !db || typeof Mon !== 'function' ||
        typeof game.getPlayerMons !== 'function' ||
        typeof game.addPlayerMon !== 'function' ||
        typeof game.saveMonsData !== 'function' || typeof db.getAllMons !== 'function') {
      throw Error('This game version does not support adding owned Dynamons');
    }
    var maxLevel = Number(typeof Mon.getMaxLevel === 'function' ? Mon.getMaxLevel() : NaN);
    if (!Number.isInteger(maxLevel) || maxLevel < 1) throw Error('Cannot determine the game maximum level');
    var owned = Object.create(null), unique = Object.create(null), pending = [], upgrades = [];
    game.getPlayerMons(true).forEach(function (mon) {
      if (mon && typeof mon.getId === 'function') {
        owned[mon.getId()] = true;
        if (typeof mon.getLevel !== 'function') throw Error('Cannot read owned Dynamon level');
        var level = Number(mon.getLevel());
        if (!Number.isInteger(level) || level < 1) throw Error('Invalid owned Dynamon level');
        if (level < maxLevel) {
          if (typeof mon.doLevelUp !== 'function') throw Error('Cannot upgrade owned Dynamons');
          upgrades.push({mon: mon, levels: maxLevel - level});
        }
      }
    });
    // Construct first: an invalid database row must not leave a partial collection.
    db.getAllMons().forEach(function (data) {
      if (!data || typeof data.id !== 'string' || !data.id || data.mergedDynamon != null ||
          /^sealed_door/.test(data.id) || unique[data.id]) return;
      unique[data.id] = true;
      if (!owned[data.id]) pending.push(new Mon(data.id, maxLevel));
    });
    var added = 0, upgraded = 0;
    try {
      upgrades.forEach(function (entry) {
        entry.mon.doLevelUp(false, entry.levels);
        if (Number(entry.mon.getLevel()) !== maxLevel) throw Error('Level upgrade did not reach maximum');
        upgraded++;
      });
      pending.forEach(function (mon) {
        game.addPlayerMon(mon);
        added++;
      });
      // The game's own method persists both MONS_DATA and CAPTURED_MONS.
      // GameState has no setString method in 1.13.37.
      game.saveMonsData();
    } catch (error) {
      throw Error('Unlock stopped after ' + added + ' additions and ' + upgraded + ' upgrades: ' + String(error.message || error));
    }
    return {ok: true, added: added, upgraded: upgraded, maxLevel: maxLevel, owned: game.getPlayerMons(true).filter(Boolean).length,
      message: added + ' Dynamons added at level ' + maxLevel + '; ' + upgraded + ' owned Dynamons upgraded'};
  }
  function unlockWorlds() {
    requireOpen('unlockWorlds');
    var game=cls('meta.GameState'), db=cls('data.GameplayDB');
    if(!game||!db||typeof db.getHubData!=='function'||typeof game.setMapUnlocked!=='function'||
       typeof game.setItemAmount!=='function'||typeof game.saveItems!=='function')throw Error('World unlock API unavailable');
    var hub=db.getHubData(), nodes=hub&&hub.mapNodes;
    if(!Array.isArray(nodes))throw Error('World catalogue unavailable');
    game.setItemAmount('unlock_all_worlds',1);
    var count=0;
    nodes.forEach(function(node){
      if(!node||typeof node.id!=='string'||!node.id)return;
      game.setMapUnlocked(node.id,true);count++;
      if(typeof db.getActiveMapVariant==='function'){
        var variant=db.getActiveMapVariant(node.id);
        if(variant&&variant.idModifier)game.setMapUnlocked(node.id+String(variant.idModifier),true);
      }
    });
    game.saveItems();
    return {ok:true,worlds:count,message:count+' world entries unlocked; reopen the map'};
  }
  function install() {
    var bridge = window.__DG_NATIVE;
    if (!bridge || typeof bridge.command !== 'function' || bridge.__dgMenuFix === revision) return;
    var previous = bridge.command;
    bridge.command = function (name, args) {
      args = args || {};
      try {
        if (name === 'unlock' && args.kind === 'Mons') return addMissingMons();
        if (name === 'unlock' && args.kind === 'Worlds') return unlockWorlds();
        if (name === 'unlockAll') {
          ['Mons', 'Skins', 'Emotes', 'Avatars', 'Worlds'].forEach(function (kind) {
            requireOpen('unlock' + kind);
          });
          var messages = [];
          ['Mons', 'Skins', 'Emotes', 'Avatars', 'Worlds'].forEach(function (kind) {
            var result = bridge.command('unlock', {kind: kind});
            if (!result || !result.ok) throw Error(kind + ': ' + (result && result.error || 'Action failed'));
            messages.push(result.message);
          });
          return {ok: true, message: messages.join(' · ')};
        }
        var result = previous.call(bridge, name, args);
        if(name==='scan' && result && result.ok && result.mons){result.mons.forEach(function(mon){mon.sideId=mon.side==='Enemy'?'enemy':'player';});}

        if (name === 'party' && result && result.ok) {
          var game = cls('meta.GameState');
          result.value = game.getParty().filter(Boolean).length;
        }
        return result;
      } catch (error) {
        return {ok: false, error: String(error.message || error)};
      }
    };
    var snapshot=bridge.snapshot;
    bridge.snapshot=function(){
      var result=snapshot.apply(bridge,arguments);
      if(result&&result.ok){
        result.flags=result.flags||{};result.flags.shopfix=true;
        var next={};Object.keys(result.locks||{}).forEach(function(key){next[key]=result.locks[key];});
        next.shopfix=true;
        if(window.__DG_matchActive&&window.__DG_matchActive())next.botMatch=true;
        result.locks=next;
      }
      return result;
    };
    bridge.__dgMenuFix = revision;
  }
  var previousInstaller = window.__DG_INSTALL_NATIVE;
  if (typeof previousInstaller === 'function') {
    window.__DG_INSTALL_NATIVE = function () {
      var result = previousInstaller.apply(this, arguments);
      install();
      return result;
    };
  }
  install();
})();
