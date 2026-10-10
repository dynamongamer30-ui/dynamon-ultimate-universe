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
