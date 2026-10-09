'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const adapter=fs.readFileSync(__dirname+'/native_adapter.js','utf8');
let tests=0;
function fixture(){
 const saved=new Map(),timers=[],changes=[];
 const makeMon=(id)=>({id,hp:90,stats:{atk:20,def:18,aim:95},getId(){return id},getUid(){return id},getLevel(){return 10},getData(){return {id,title:id}},getCurrHP(){return this.hp},getTotalHP(){return 100},getStat(k){return this.stats[k]},offsetStat(k,n){this.stats[k]+=n},forceSetHP(n){this.hp=n}});
 const mons=[makeMon('one'),makeMon('two'),makeMon('three'),makeMon('four'),makeMon('five')];
 const g={coins:10,dust:20,party:mons.slice(0,3),_playerItems:{h:{}},_capturedMons:[],
 getPlayerCoins(){return this.coins},setPlayerCoins(n){this.coins=n},getPlayerDust(){return this.dust},setPlayerDust(n){this.dust=n},getParty(){return this.party},getPlayerMons(){return mons},
 setMonsToPartyPosition(list){this.party=list.map(x=>x.mon)},saveMonsData(){},getItemAmount(id){return this._playerItems.h[id]||0},setItemAmount(id,n){this._playerItems.h[id]=n},saveItems(){},setString(k,v){saved.set(k,v)},addAvatarBought(id){changes.push(id)}};
 const db={getAllMons(){return [{id:'one'},{id:'two'}]},getAllSuits(){return [{id:'inferno',linkedIcon:'inferno'}]},getAllItems(){return [{id:'potion',title:'Potion'},{id:'inferno_armor',title:'Inferno armor'},{id:'inferno_suit',title:'Legacy duplicate'},{id:'emote#happy'},{id:'skin#one_skin'}]}};
 const F={god:false,oneHit:false,noCD:false,botMatch:false,autoWorld:false,autoGrind:false,fullheal:false,itemtimer:false,saveSettings:true};
 const w={__DGF:{},__DG_LOCKS:{},$DG:{applySpeed(){}},__DG_API:{F,getSpeed(){return w.speed||1},setSpeed(n){w.speed=n},set(k,v){F[k]=v}},$DW:{'co.doubleduck.dynamons3.meta.GameState':g,'co.doubleduck.dynamons3.data.GameplayDB':db},__curBattle:{},
 __DG_grind(on){w.__DG_GRIND=on;w.__DG_GRIND_PAUSED=false},__DG_autoWorld(on){F.autoWorld=on},__DG_autoWorldStatus(){return {on:F.autoWorld,pct:50}},__DG_awPause(on){w.paused=on},__DG_grindPause(on){w.__DG_GRIND_PAUSED=on}};
 w.window=w;w.setInterval=fn=>{timers.push(fn);return timers.length};
 w.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 w.document={getElementById(){return null},createElement(){return {}},head:{appendChild(){}},documentElement:{appendChild(){}}};
 vm.runInNewContext(adapter,w);return {w,g,F,saved,timers,mons,run:(name,args={})=>w.__DG_NATIVE.command(name,args)};
}
function test(name,fn){try{fn();tests++;console.log('PASS '+name)}catch(e){console.error('FAIL '+name);throw e}}
test('read snapshot returns game values',()=>{const f=fixture();assert.equal(f.w.__DG_NATIVE.snapshot().coins,10)});
test('currency command uses setter and returns actual getter',()=>{const f=fixture();assert.equal(f.run('coins',{value:250}).value,250);assert.equal(f.g.coins,250)});
test('invalid currency leaves value untouched',()=>{const f=fixture();assert.equal(f.run('coins',{value:-1}).ok,false);assert.equal(f.g.coins,10)});
test('remote currency lock blocks write',()=>{const f=fixture();f.w.__DG_LOCKS.setCoins=true;assert.equal(f.run('coins',{value:999}).ok,false);assert.equal(f.g.coins,10)});
test('flags sync patched globals and persistent settings',()=>{const f=fixture();assert.equal(f.run('flag',{key:'fullheal',value:true}).ok,true);assert.equal(f.w.__DGF.fullheal,true);assert.equal(JSON.parse(f.saved.get('__DG_F_v2')).values.fullheal,true)});
test('unknown flag rejected',()=>{const f=fixture();assert.equal(f.run('flag',{key:'invented',value:true}).ok,false)});
test('grind restores preexisting controls on stop',()=>{const f=fixture();f.F.god=true;f.run('flag',{key:'autoGrind',value:true});assert.equal(f.F.oneHit,true);f.run('flag',{key:'autoGrind',value:false});assert.equal(f.F.god,true);assert.equal(f.F.oneHit,false);assert.equal(f.w.__DG_FORCEBOT,false)});
test('automation mutual exclusion',()=>{const f=fixture();f.F.autoWorld=true;assert.equal(f.run('flag',{key:'autoGrind',value:true}).ok,false);assert.equal(f.F.autoGrind,false)});
test('grind start validates dependency locks before mutation',()=>{const f=fixture();f.w.__DG_LOCKS.god=true;assert.equal(f.run('flag',{key:'autoGrind',value:true}).ok,false);assert.equal(f.F.botMatch,false)});
test('remote locks stop hidden automation and sync patched flags',()=>{const f=fixture();f.run('flag',{key:'autoGrind',value:true});f.F.fullheal=true;f.w.__DG_LOCKS={oneHit:true,fullheal:true};f.timers[0]();assert.equal(f.F.autoGrind,false);assert.equal(f.w.__DG_GRIND,false);assert.equal(f.w.__DGF.fullheal,false)});
test('profile lock validation is atomic before setting flags',()=>{const f=fixture();f.w.__DG_LOCKS.oneHit=true;assert.equal(f.run('profile',{values:{god:true,oneHit:true}}).ok,false);assert.equal(f.F.god,false)});
test('automation flags excluded when restoring profiles',()=>{const f=fixture();f.run('profile',{values:{god:true,autoWorld:true,autoGrind:true}});assert.equal(f.F.god,true);assert.equal(f.F.autoWorld,false);assert.equal(f.F.autoGrind,false)});
test('items omit duplicate and restricted categories',()=>{const f=fixture(),r=f.run('items');assert.equal(r.ok,true);assert.deepEqual(Array.from(r.items,x=>x.id),['potion','inferno_armor'])});
test('item update rejects unknown ids',()=>{const f=fixture();assert.equal(f.run('item',{id:'fake',value:5}).ok,false)});
test('team changes to five and back to three',()=>{const f=fixture();assert.equal(f.run('party',{value:5}).ok,true);assert.equal(f.g.party.length,5);f.run('party',{value:3});assert.equal(f.g.party.length,3)});
test('stat editing adjusts by delta',()=>{const f=fixture(),scan=f.run('scan');assert.equal(f.run('stat',{token:scan.token,index:0,stat:'atk',value:50}).ok,true);assert.equal(f.mons[0].stats.atk,50)});
test('stale battle scan rejected',()=>{const f=fixture(),scan=f.run('scan');f.w.__curBattle={};assert.equal(f.run('stat',{token:scan.token,index:0,stat:'atk',value:50}).ok,false);assert.equal(f.mons[0].stats.atk,20)});
test('HP never exceeds scanned monster max',()=>{const f=fixture(),scan=f.run('scan');assert.equal(f.run('stat',{token:scan.token,index:0,stat:'hp',value:101}).ok,false)});
test('speed lock while auto world active',()=>{const f=fixture();f.F.autoWorld=true;assert.equal(f.run('speed',{value:4}).ok,false)});
test('missing speed patch reported',()=>{const f=fixture();delete f.w.$DG.applySpeed;assert.equal(f.run('speed',{value:4}).ok,false)});
test('pause bridges to automation hook',()=>{const f=fixture();assert.equal(f.run('pause',{kind:'world',value:true}).ok,true);assert.equal(f.w.paused,true)});
test('old payload explicitly reports unsupported pause',()=>{const f=fixture();delete f.w.__DG_awPause;assert.equal(f.run('pause',{kind:'world',value:true}).ok,false)});
test('emote unlock changes only matching inventory',()=>{const f=fixture();f.run('unlock',{kind:'Emotes'});assert.equal(f.g._playerItems.h['emote#happy'],1);assert.equal(f.g._playerItems.h.potion,undefined)});
test('native attachment is idempotent',()=>{const f=fixture();vm.runInNewContext(adapter,f.w);assert.equal(f.timers.length,1)});
test('inventory supplies original item artwork paths',()=>{const f=fixture(),list=f.run('items').items;assert.equal(list[0].image,'images/items/icons/potion.png');assert.equal(list[1].image,'images/general/char_icons/inferno_icon.png')});
test('all controls round trip restores speed, flags, currency, inventory and party',()=>{const f=fixture();f.F.god=true;f.g.coins=500;f.g._playerItems.h.potion=77;f.w.speed=2.5;const c=JSON.parse(JSON.stringify(f.run('exportControls').controls));f.F.god=false;f.g.coins=1;f.w.speed=1;f.g._playerItems.h.potion=0;assert.equal(f.run('restoreControls',{controls:c}).ok,true);assert.equal(f.F.god,true);assert.equal(f.g.coins,500);assert.equal(f.w.speed,2.5);assert.equal(f.g._playerItems.h.potion,77)});
test('portable restore validates locked flags before any mutation',()=>{const f=fixture();const c=f.run('exportControls').controls;c.flags.god=true;c.coins=500;f.w.__DG_LOCKS.god=true;assert.equal(f.run('restoreControls',{controls:c}).ok,false);assert.equal(f.g.coins,10);assert.equal(f.F.god,false)});
test('portable restore rejects unavailable items before mutation',()=>{const f=fixture();const c=f.run('exportControls').controls;c.items.push({id:'missing',amount:5});c.coins=500;assert.equal(f.run('restoreControls',{controls:c}).ok,false);assert.equal(f.g.coins,10)});
test('portable restore never starts saved automation',()=>{const f=fixture();const c=f.run('exportControls').controls;c.flags.autoWorld=true;c.flags.autoGrind=true;assert.equal(f.run('restoreControls',{controls:c}).ok,true);assert.equal(f.F.autoWorld,false);assert.equal(f.F.autoGrind,false)});
test('combined unlock prevalidates all category locks',()=>{const f=fixture();f.w.__DG_LOCKS.unlockSkins=true;assert.equal(f.run('unlockAll').ok,false);assert.equal(f.g._capturedMons.length,0)});
test('global mod lock blocks commands and stops automation',()=>{const f=fixture();f.run('flag',{key:'autoGrind',value:true});f.w.__DG_LOCKS.mods=true;f.timers[0]();assert.equal(f.F.autoGrind,false);assert.equal(f.run('coins',{value:999}).ok,false);assert.equal(f.g.coins,10)});
test('global unlock lock blocks combined collection changes',()=>{const f=fixture();f.w.__DG_LOCKS.unlock=true;assert.equal(f.run('unlockAll').ok,false);assert.equal(f.g._capturedMons.length,0)});
console.log(tests+' bridge behavior tests passed');
