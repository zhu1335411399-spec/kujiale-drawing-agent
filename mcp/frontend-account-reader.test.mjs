import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrontendAccountReader} from '../browser-extension/frontend-account-reader.js';

const flush=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const saved={},events={},calls=[];let epoch=10,clock=1000,avatarCount=1,inspectGate=null,hoverGate=null,fail=false,drawingOpen=false;
 const event=name=>({addListener:f=>{events[name]=f;},removeListener(){}});
 const api={tabs:{get:async()=>({url:'https://www.kujiale.com/tool/h5/bim'}),onUpdated:event('updated'),onRemoved:event('removed'),onReplaced:event('replaced')},scripting:{executeScript:async()=>[{result:{documentEpoch:epoch,url:'https://www.kujiale.com/tool/h5/bim',ready:'complete',hasContent:true,workspace:{stage:drawingOpen?'drawing-editor':'design',drawingOpen,templateVerified:false}}}]},storage:{session:{get:async k=>({[k]:saved[k]}),set:async v=>{Object.assign(saved,v);},remove:async keys=>{for(const k of keys)delete saved[k];}}}};
 const identity=async({args})=>{calls.push(args);if(fail)throw Error('temporary read failure');if(args.action==='inspect'){if(inspectGate)await inspectGate;return{frames:[{frameId:0,avatarCandidates:Array.from({length:avatarCount},(_,i)=>({avatarKey:'ordinary-header-avatar-'+i,accountAvatar:true}))}]};}if(hoverGate)await hoverGate;return{status:'identity-read',companyDisplayName:'Fixture '+epoch,visibleAccountId:null,identityVerified:false,readAt:new Date(clock).toISOString()};};
 const reader=createFrontendAccountReader({api,identity,browser:()=> 'Edge',now:()=>clock,budgetMs:40});
 return{api,reader,saved,calls,events,setEpoch:v=>{epoch=v;},setDrawingOpen:v=>{drawingOpen=v;},advance:ms=>{clock+=ms;},setAvatarCount:v=>{avatarCount=v;},setInspectGate:v=>{inspectGate=v;},setHoverGate:v=>{hoverGate=v;},setFailure:v=>{fail=v;}};
}
test('ordinary designer supports one shared account read across concurrent views',async()=>{
 const f=fixture();const [a,b]=await Promise.all([f.reader.read(7),f.reader.read(7,{force:true})]);
 assert.equal(a.companyDisplayName,'Fixture 10');assert.equal(b.companyDisplayName,a.companyDisplayName);assert.equal(a.workspace.drawingOpen,false);assert.equal(a.visibleAccountId,null);
 assert.equal(f.calls.filter(x=>x.action==='inspect').length,1);assert.equal(f.calls.filter(x=>x.action==='hover').length,1);f.reader.dispose();
});
test('refresh reuses even an old account result until explicit manual refresh',async()=>{
 const f=fixture();await f.reader.read(7);f.advance(60000);const cached=await f.reader.read(7);assert.equal(cached.cached,true);assert.equal(cached.stale,true);assert.equal(f.calls.length,2);
 await f.reader.read(7,{force:true});assert.equal(f.calls.length,4);f.reader.dispose();
});
test('missing or ambiguous avatar and read failures never trigger automatic retry loops',async()=>{
 for(const count of [0,2]){const f=fixture();f.setAvatarCount(count);const a=await f.reader.read(7);assert.equal(a.companyDisplayName,null);await f.reader.read(7);await f.reader.read(7);assert.equal(f.calls.length,1);f.setAvatarCount(1);assert.equal((await f.reader.read(7,{force:true})).status,'identity-read');f.reader.dispose();}
 const f=fixture();f.setFailure(true);assert.equal((await f.reader.read(7)).reason,'account-read-failed');await f.reader.read(7);assert.equal(f.calls.length,1);f.reader.dispose();
});
test('timeout stops the loading state and a late inspection cannot start hovering',async()=>{
 const f=fixture();let release;f.setInspectGate(new Promise(r=>{release=r;}));const result=await f.reader.read(7);assert.equal(result.reason,'timeout');assert.equal((await f.reader.read(7)).reason,'timeout');assert.equal(f.calls.length,1);release();await flush();await flush();assert.equal(f.calls.filter(x=>x.action==='hover').length,0);assert.equal((await f.reader.read(7)).reason,'timeout');f.reader.dispose();
});
test('same-URL reload invalidates cached identity and rejects a late result',async()=>{
 const f=fixture();let release;f.setHoverGate(new Promise(r=>{release=r;}));const pending=f.reader.read(7);await flush();f.setEpoch(11);f.events.updated(7,{status:'loading'});release();await pending;assert.equal(f.saved['frontendAccountV2:7'],undefined);
 f.setHoverGate(null);const fresh=await f.reader.read(7);assert.equal(fresh.companyDisplayName,'Fixture 11');f.reader.dispose();
});
test('drawing refresh preserves the last same-document identity until avatar is visible again',async()=>{
 const f=fixture();const original=await f.reader.read(7);f.setDrawingOpen(true);f.setAvatarCount(0);
 const blocked=await f.reader.read(7,{force:true});
 assert.equal(blocked.status,'identity-refresh-required');assert.equal(blocked.companyDisplayName,original.companyDisplayName);
 assert.equal(blocked.stale,true);assert.equal(blocked.refreshRequired,true);assert.equal(f.calls.length,2);
 assert.equal(f.saved['frontendAccountV2:7'].value.companyDisplayName,original.companyDisplayName);
 f.setDrawingOpen(false);f.setAvatarCount(1);const refreshed=await f.reader.read(7,{force:true});
 assert.equal(refreshed.companyDisplayName,original.companyDisplayName);assert.equal(refreshed.refreshRequired,undefined);assert.equal(f.calls.length,4);f.reader.dispose();
});
test('drawing refresh with no same-document identity does not invent or cache an account',async()=>{
 const f=fixture();f.setDrawingOpen(true);const result=await f.reader.read(7,{force:true});
 assert.equal(result.companyDisplayName,null);assert.equal(result.refreshRequired,true);assert.equal(f.calls.length,0);
 assert.equal(f.saved['frontendAccountV2:7'],undefined);f.reader.dispose();
});

