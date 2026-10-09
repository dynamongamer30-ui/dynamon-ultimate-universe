import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const load = source => import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const policy = await load(read('src/lib/dgKeyPolicy.ts'));
const now = 100000;
assert.equal(policy.isKeyExpired({device:null,expiry:1},now),false,'unactivated keys do not expire before first login');
assert.equal(policy.isKeyExpired({device:'phone',expiry:0},now),false,'zero means lifetime after binding');
assert.equal(policy.isKeyExpired({device:'phone',expiry:now},now),true,'expiry boundary matches Worker');
assert.equal(policy.isKeyExpired({device:'phone',expiry:now+1},now),false);
assert.equal(policy.extendedKeyData({device:null,durationHours:24,expiry:1},24,now).expiry,0);
assert.equal(policy.extendedKeyData({device:'phone',durationHours:24,expiry:now-1},24,now).expiry,now+86400);
assert.equal(policy.extendedKeyData({device:'phone',durationHours:24,expiry:now+10},24,now).expiry,now+86410);
assert.throws(()=>policy.extendedKeyData({device:'phone',durationHours:0,expiry:0},24,now),/lifetime/);
assert.throws(()=>policy.extendedKeyData({},NaN,now));

// Exercise the actual data layer against a minimal PostgREST double, including conflicts.
const rows = new Map();
const clone = value => value == null ? value : structuredClone(value);
let changeBeforeWrite = null;
const client = {from(table) {
  let op='read',value,filters={};
  const query = {
    select(){return query;},eq(k,v){filters[k]=v;return query;},
    insert(v){op='insert';value=v;return query;},update(v){op='update';value=v;return query;},
    async maybeSingle(){return {data:clone(rows.get(table+':'+filters.id)) || null,error:null};},
    then(resolve,reject){
      try {
        if(changeBeforeWrite){const hook=changeBeforeWrite;changeBeforeWrite=null;hook();}
        const id=value?.id ?? filters.id,key=table+':'+id,existing=rows.get(key);
        if(op==='insert') {
          if(existing)return Promise.resolve({error:{code:'23505',message:'duplicate'}}).then(resolve,reject);
          rows.set(key,clone(value));return Promise.resolve({error:null}).then(resolve,reject);
        }
        if(op==='update') {
          if(!existing || JSON.stringify(existing.data)!==filters.data)return Promise.resolve({data:[],error:null}).then(resolve,reject);
          rows.set(key,{...existing,...clone(value)});return Promise.resolve({data:[{id}],error:null}).then(resolve,reject);
        }
        throw Error('Unexpected query');
      }catch(e){return Promise.reject(e).then(resolve,reject);}
    }
  };return query;
}};
globalThis.__keyTestClient=client;globalThis.__keyTestPolicy=policy;
const source=read('src/lib/dgData.ts')
 .replace('import { supabase } from "@/integrations/supabase/client";','const supabase = globalThis.__keyTestClient;')
 .replace('import { extendedKeyData } from "@/lib/dgKeyPolicy";','const {extendedKeyData} = globalThis.__keyTestPolicy;');
const data=await load(source);
await data.compareConfigNode('FeatureLocks',{skins:true},null);
await assert.rejects(data.compareConfigNode('FeatureLocks',{skins:false},null),/changed elsewhere/);
await data.compareConfigNode('FeatureLocks',{skins:false},{skins:true});
await assert.rejects(data.compareConfigNode('FeatureLocks',{god:true},{skins:true}),/changed elsewhere/);
assert.deepEqual(rows.get('app_config:FeatureLocks').data,{skins:false});
await assert.rejects(data.revokeKey('missing'),/no longer exists/);
rows.set('valid_keys:test',{id:'test',data:{status:'active',durationHours:24,expiry:1,device:'phone'}});
changeBeforeWrite=()=>rows.get('valid_keys:test').data.device='another-phone';
await assert.rejects(data.revokeKey('test'),/changed elsewhere/);
assert.equal(rows.get('valid_keys:test').data.status,'active');
const id=await data.createManualKey('VIP',0);
assert.match(id,/^VIP-[A-Z2-9]{16}$/);
assert.equal(rows.get('valid_keys:'+id).data.expiry,0);
assert.equal(rows.get('valid_keys:'+id).data.durationHours,0);
await assert.rejects(data.createManualKey('DG',-1));
await assert.rejects(data.createManualKey('../bad',24));
console.log('PASS key timing, lifetime preservation, conditional config/key writes and secure key creation');
