import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCaptureStore } from '../browser-extension/capture-store.js';

function fixture() {
  const data = {}, calls = [];
  const event = () => ({ listeners: [], addListener(fn) { this.listeners.push(fn); }, emit(...args) { for (const fn of this.listeners) fn(...args); } });
  const api = {
    storage: { session: {
      async get(k) { return structuredClone(k === null ? data : { [k]: data[k] }); },
      async set(v) { Object.assign(data, structuredClone(v)); }, async remove(k) { delete data[k]; }
    } },
    tabs: { async get() { return { url:'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style' }; }, onUpdated: event(), onRemoved:event() },
    debugger: { onEvent:event(), onDetach:event(),
      async attach(t) { calls.push(['attach',t]); }, async detach(t) { calls.push(['detach',t]); },
      async sendCommand(t,m) { calls.push([m,t]); return { body:'{"c":"0","token":"private"}' }; } },
    alarms: { onAlarm:event(), async create() {} }
  };
  let time = 1000;
  let store = createCaptureStore(api, () => time);
  const emit = async (m,p) => { api.debugger.onEvent.emit({tabId:7},m,p); await store.idle(); };
  const request = (id='r1', url='https://www.kujiale.com/construction-cms/api/net-config') => ({ requestId:id,loaderId:'document-1',request:{url,method:'POST',postData:'{"name":"test","password":"private"}' } });
  return { api,calls,data,request,emit,get store(){return store;},setTime:t=>time=t,
    restart() { api.debugger.onEvent.listeners=[]; api.debugger.onDetach.listeners=[]; api.alarms.onAlarm.listeners=[]; api.tabs.onUpdated.listeners=[]; api.tabs.onRemoved.listeners=[]; store=createCaptureStore(api,()=>time); } };
}
test('keeps requests and continues after page reload and worker restart', async () => {
  const f=fixture(); await f.store.action(7,'start'); await f.emit('Network.requestWillBeSent',f.request());
  f.api.tabs.onUpdated.emit(7,{url:'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style'}); await f.store.idle();
  f.restart(); await f.emit('Network.responseReceived',{requestId:'r1',response:{status:200,mimeType:'application/json',headers:{}}});
  await f.emit('Network.loadingFinished',{requestId:'r1',encodedDataLength:40});
  await f.emit('Network.requestWillBeSent',f.request('r2'));
  const read=await f.store.action(7,'read'); assert.equal(read.active,true); assert.equal(read.records.length,2);
  assert.equal(read.records[0].responseBody.value.c,'0'); assert.equal(read.records[0].responseBody.value.token,'[redacted]');
  assert.equal(read.records[0].requestBody.value.password,'[redacted]');
  assert.equal(f.calls.filter(c=>c[0]==='attach').length,1);
});
test('filters unrelated, cross-origin and other-tab traffic; no replay', async()=>{
  const f=fixture(); await f.store.action(7,'start');
  await f.emit('Network.requestWillBeSent',f.request('x','https://other.example/construction-cms/api/test'));
  await f.emit('Network.requestWillBeSent',f.request('y','https://www.kujiale.com/analytics'));
  f.api.debugger.onEvent.emit({tabId:8},'Network.requestWillBeSent',f.request()); await f.store.idle();
  assert.equal((await f.store.action(7,'read')).records.length,0);
  assert.ok(f.calls.every(c=>['attach','Network.enable'].includes(c[0])));
});
test('stop retains evidence, repeated start is idempotent, clear removes evidence', async()=>{
  const f=fixture(); await f.store.action(7,'start'); await f.store.action(7,'start'); await f.emit('Network.requestWillBeSent',f.request());
  const s=await f.store.action(7,'stop'); assert.equal(s.records.length,1); assert.equal(s.active,false); assert.equal(s.records[0].incomplete,true);
  await f.emit('Network.requestWillBeSent',f.request('later')); assert.equal((await f.store.action(7,'read')).records.length,1);
  assert.equal(f.calls.filter(c=>c[0]==='attach').length,1);
  assert.equal((await f.store.action(7,'clear')).records.length,0);
});
test('expiry and debugger detach are reported without losing records',async()=>{
  const f=fixture(); await f.store.action(7,'start'); await f.emit('Network.requestWillBeSent',f.request()); f.setTime(601001);
  f.api.alarms.onAlarm.emit({name:'drawingCaptureExpiryV2'}); await f.store.idle();
  assert.equal((await f.store.action(7,'read')).stopReason,'expired');
  f.setTime(700000); await f.store.action(7,'start'); f.api.debugger.onDetach.emit({tabId:7},'canceled_by_user'); await f.store.idle();
  const s=await f.store.action(7,'read'); assert.equal(s.active,false); assert.equal(s.records.length,1); assert.match(s.stopReason,/detached/);
});
test('encoded responses are not JSON success; overflow is explicit and bounded',async()=>{
  const f=fixture(); f.api.debugger.sendCommand=async()=>({body:'5 encoded response'}); await f.store.action(7,'start');
  for(let i=0;i<25;i++)await f.emit('Network.requestWillBeSent',f.request('r'+i));
  await f.emit('Network.loadingFinished',{requestId:'r24',encodedDataLength:30});
  const s=await f.store.action(7,'read'); assert.equal(s.records.length,20); assert.equal(s.dropped,5);
  assert.equal(s.records.at(-1).responseBody.format,'encoded-or-text'); assert.equal(s.saved,false);
});
test('attach failure is explicit, target rejection happens before attaching',async()=>{
  const f=fixture(); f.api.debugger.attach=async()=>{throw Error('DevTools conflict');};
  assert.equal((await f.store.action(7,'start')).error,'DevTools conflict');
  f.api.tabs.get=async()=>({url:'https://other.example/'});
  await assert.rejects(f.store.action(7,'start'),/Not a configuration/);
});
test('leaving configuration scope stops capture and retains records',async()=>{
  const f=fixture(); await f.store.action(7,'start'); await f.emit('Network.requestWillBeSent',f.request());
  f.api.tabs.onUpdated.emit(7,{url:'https://www.kujiale.com/other'}); await f.store.idle();
  const s=await f.store.action(7,'read'); assert.equal(s.active,false); assert.equal(s.records.length,1);
});
