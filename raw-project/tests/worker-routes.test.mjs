import assert from 'node:assert/strict';
import { timingSafeEqual } from 'node:crypto';
import worker from '../backend/license/src/index.js';
if(!crypto.subtle.timingSafeEqual)crypto.subtle.timingSafeEqual=(a,b)=>timingSafeEqual(Buffer.from(a),Buffer.from(b));
const records=new Map();
let patches=0,puts=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
 const u=new URL(url),table=u.pathname.split('/').at(-1),id=(u.searchParams.get('id')||'').replace(/^eq\./,'');
 const key=table+'/'+id;
 if(options.method==='PATCH'){
  patches++;const expected=JSON.parse(JSON.parse((u.searchParams.get('data')||'').replace(/^eq\./,'')));
  const current=records.get(key);
  if(JSON.stringify(current)!==JSON.stringify(expected))return Response.json([]);
  const next=JSON.parse(options.body).data;records.set(key,next);return Response.json([{id,data:next}]);
 }
 if(options.method==='POST'){puts++;const row=JSON.parse(options.body);records.set(table+'/'+row.id,row.data);return Response.json({});}
 const data=records.get(key);return Response.json(data===undefined?[]:[{id,data}]);
};
const env={SUPABASE_URL:'https://database.example',SUPABASE_SERVICE_KEY:'test-only',ADMIN_KEY:'test-only-admin',DG:{async get(key){if(key.startsWith('key:'))return {key_b64:'test-key',ct_sha:'hash'};return null;}}};
async function call(path,body){return (await worker.fetch(new Request('https://worker.example'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),env)).json();}
try{
 const fp='route-device',key='example-key',now=Date.now();
 records.set('activated_users/'+fp,{key,lastLogin:now});records.set('valid_keys/'+key,{device:fp,status:'active',expiry:Math.floor(now/1000)+600});
 assert.equal((await call('/check',{fp,build:'v1',ctsha:'hash'})).key,'test-key');
 records.get('valid_keys/'+key).expiry=Math.floor(now/1000)-1;
 assert.equal((await call('/check',{fp,build:'v1',ctsha:'hash'})).reason,'expired');
 const heartbeat=await call('/heartbeat',{fp,build:'v1'});
 assert.equal(heartbeat.stateless,true);
 assert.equal(puts,0);
 records.get('valid_keys/'+key).expiry=0;records.set('app_config/Maintenance',true);
 assert.equal((await call('/check',{fp,build:'v1',ctsha:'hash'})).reason,'maintenance');records.set('app_config/Maintenance',false);
 let before=puts;await call('/tamper',{fp,kind:'debugger'});assert.equal(puts,before);assert.equal(records.has('banned_devices/'+fp),false);
 assert.equal((await call('/check',{fp,build:'v1',ctsha:'wrong'})).reason,'integrity');assert.equal(records.has('banned_devices/'+fp),false);
 records.set('valid_keys/unbound',{device:'',status:'active',durationHours:24});
 const results=await Promise.all([call('/verify-key',{key:'unbound',fp:'first'}),call('/verify-key',{key:'unbound',fp:'second'})]);
 assert.equal(results.filter(x=>x.ok).length,1);assert.equal(patches,2);
 async function admin(value){const headers=value===null?{}:{'X-Admin':value};return worker.fetch(new Request('https://worker.example/admin/list',{headers}),env);}
 assert.equal((await admin(null)).status,403);assert.equal((await admin('incorrect')).status,403);
 assert.equal((await admin('test-only-admin')).status,200);
 console.log('PASS Worker route checks: key release, expiry, no-write heartbeat compatibility, maintenance, no spoofed bans, concurrent activation');
}finally{globalThis.fetch=originalFetch;}
