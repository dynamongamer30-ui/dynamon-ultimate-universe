import assert from 'node:assert/strict';
import worker from '../backend/license/src/index.js';
let io=0;
const oldFetch=globalThis.fetch;
globalThis.fetch=async()=>{io++;throw new Error('Unexpected remote call');};
try{
 const r=await worker.fetch(new Request('https://dg.example/heartbeat',{method:'POST',body:'{}'}),{DG:{get(){io++;throw new Error('Unexpected KV read');}}});
 assert.equal((await r.json()).stateless,true);assert.equal(io,0);
 const src=await import('node:fs/promises');
 const java=await src.readFile(new URL('../src/com/dynamongamer/royalvoid/NativePayloadLoader.java',import.meta.url),'utf8');
 assert.equal(java.includes('request("/heartbeat"'),false);
 console.log('PASS free-tier path: heartbeat compatibility uses zero database/KV requests; DEX has no heartbeat request');
}finally{globalThis.fetch=oldFetch;}
