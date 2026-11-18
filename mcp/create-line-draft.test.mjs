import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLineDraft } from '../browser-extension/create-line-draft.js';
const args={requestId:'draft-test-001',expectedConfigName:'RICE1',expectedCustomerName:'你的账号',name:'6',lineType:'DOT',colorIndex:'255',widthMm:'0.09'};
function fixture(uncertain=false){
  const ledger={}, actions=[]; let row;
  const chromeApi={storage:{local:{get:async k=>({[k]:ledger[k]}),set:async v=>Object.assign(ledger,v)}},scripting:{executeScript:async o=>{
    const a=o.args[0]; actions.push(a.action);
    if(a.action==='inspect')return[{result:{status:'observed',before:row?[{...row}]:[]}}];
    if(a.action==='create'){row={id:'a',name:'新建线样式',lineType:'CONTINUOUS',color:'7',widthMm:'0.13',scale:''};return[{result:uncertain?{status:'creation-outcome-unknown'}:{status:'created-ui-only',createdRow:{...row}}}];}
    assert.ok(['rename','lineType','colorIndex','widthMm'].includes(a.action));
    row[a.action==='rename'?'name':a.action==='colorIndex'?'color':a.action]=a.value;
    return[{result:{status:'edited-ui-only',after:{...row}}}];
  }}};
  return{chromeApi,actions};
}
test('draft sets requested fields without scale, save, reload or publish',async()=>{
  const f=fixture(); const r=await createLineDraft({...f,tabId:1,args});
  assert.equal(r.status,'draft-fields-verified');assert.equal(r.style.name,'6');assert.equal(r.style.lineType,'DOT');assert.equal(r.style.color,'255');assert.equal(r.style.widthMm,'0.09');assert.equal(r.saved,false);
  assert.deepEqual(f.actions.filter(a=>a!=='inspect'),['create','rename','lineType','colorIndex','widthMm']);
  const count=f.actions.length; const second=await createLineDraft({...f,tabId:1,args});assert.equal(second.status,'request-already-used');assert.equal(f.actions.length,count);
});
test('uncertain create never edits or retries',async()=>{
  const f=fixture(true);const r=await createLineDraft({...f,tabId:1,args});assert.equal(r.status,'needs-review');assert.deepEqual(f.actions,['inspect','create']);
});
test('invalid values stop before browser access',async()=>{
  const r=await createLineDraft({chromeApi:{},tabId:1,args:{...args,colorIndex:'256'}});assert.equal(r.status,'blocked');
});
