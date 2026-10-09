'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const intervals=[],timeouts=[],nodes=[],stored=new Map();
function node(tag){return {tag,id:'',style:{},appendChild(n){nodes.push(n)},addEventListener(){},classList:{add(){},remove(){}}};}
const head=node('head'),body=node('body');
const g={getPlayerCoins(){return 123},getPlayerDust(){return 45},getParty(){return []},getPlayerMons(){return []}};
const context={console:{log(){}},document:{head,body,documentElement:head,hidden:false,getElementById(id){return nodes.find(n=>n.id===id)||null},createElement:node,addEventListener(){}},
 localStorage:{getItem(k){return stored.get(k)||null},setItem(k,v){stored.set(k,v)},removeItem(k){stored.delete(k)}},
 setInterval(fn,ms){intervals.push({fn,ms});return intervals.length},clearInterval(){},setTimeout(fn,ms){timeouts.push({fn,ms});return timeouts.length},clearTimeout(){},
 addEventListener(){},navigator:{onLine:false},innerWidth:400,innerHeight:800,
 $DW:{'co.doubleduck.dynamons3.meta.GameState':g,'co.doubleduck.dynamons3.data.GameplayDB':{getAllMons(){return []}},'co.doubleduck.dynamons3.core.Mon':function(){},'co.doubleduck.dynamons3.core.Battle':function(){},'co.doubleduck.dynamons3.core.Ability':function(){}},
 performance:{now:()=>0},requestAnimationFrame(fn){fn()}};
context.window=context;context.self=context;
const code=fs.readFileSync(__dirname+'/bootstrap.js','utf8');vm.runInNewContext(code,context);
assert.ok(context.__DG_NATIVE,'bridge installed');assert.ok(context.__DG_API,'engine installed');
assert.equal(context.__DG_NATIVE.snapshot().coins,123);
assert.equal(intervals.some(x=>x.ms===30000),false,'no recurring remote config timer');
assert.equal(nodes.some(n=>n.id==='dw_panel'||n.id==='dw_fab'),false,'no legacy menu mounted');
const count=intervals.length;vm.runInNewContext(code,context);assert.equal(intervals.length,count,'bootstrap idempotent');
assert.equal(context.__DG_NATIVE.command('flag',{key:'autoWorld',value:true}).ok,true);
assert.equal(context.__DG_autoWorldStatus().on,true);
assert.equal(context.__DG_NATIVE.command('pause',{kind:'world',value:true}).ok,true);
assert.equal(context.__DG_autoWorldStatus().paused,true);
context.__DG_NATIVE.command('pause',{kind:'world',value:false});assert.equal(context.__DG_autoWorldStatus().paused,false);
context.__DG_NATIVE.command('stopAll',{});assert.equal(context.__DG_autoWorldStatus().on,false);
assert.equal(context.__DG_API.F.god,false,'controls restored after world stop');
console.log('PASS full headless runtime: installation, no legacy UI, snapshot, idempotence, pause/resume, stop/restoration');
