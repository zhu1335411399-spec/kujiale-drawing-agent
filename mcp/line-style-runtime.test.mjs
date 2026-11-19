import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createProtocol} from './protocol.mjs';
import {dispatchLineStyleTool} from './line-style-dispatch.mjs';

const code=fs.readFileSync(new URL('../browser-extension/line-style-runtime-page.js',import.meta.url),'utf8');
const style=(id,name)=>({id,name,lineType:'CONTINUOUS',scale:'',color:'7',widthMm:'0.13'});
function fixture({ack=true,rows=[style('1','Other A'),style('2','Target'),style('3','Other B'),style('4','Target extra'),style('5','Other C')]}={}){
  let data=structuredClone(rows),query='',page=0,writes=0,saves=0,reloads=0,epoch=1;
  const session=new Map(),size=2;
  const filtered=()=>data.filter(r=>r.name.includes(query));
  const current=()=>filtered().slice(page*size,(page+1)*size).map(r=>({...r}));
  const element=value=>({innerText:value,getClientRects:()=>[{}],getAttribute:()=>null,classList:{contains:()=>false},disabled:false});
  class Input{constructor(){this.current='';this.disabled=false;this.readOnly=false;}get value(){return this.current;}set value(v){this.current=v;}getClientRects(){return[{}];}getAttribute(n){return n==='placeholder'?'搜索线样式名称':null;}focus(){}closest(){return{querySelectorAll:()=>[button]};}dispatchEvent(){}}
  const input=new Input(),button=element('搜索');button.click=()=>{query=input.value;page=0;};
  const first=element('1');first.click=()=>page=0;
  const next=element('下一页');next.getAttribute=()=>page+1>=Math.ceil(filtered().length/size)?'true':'false';next.click=()=>page++;
  const document={body:element(''),querySelector:()=>element(String(page+1)),querySelectorAll:s=>s==='input'?[input]:s==='.ant-pagination-next'?[next]:s==='.ant-pagination-item-1'?[first]:[]};
  const location={href:'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style',reload(){reloads++;epoch++;}};
  const sandbox={document,location,sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)},performance:{get timeOrigin(){return epoch;}},HTMLInputElement:Input,Event:class{},KeyboardEvent:class{},getComputedStyle:()=>({visibility:'visible'}),setTimeout:fn=>fn()};
  sandbox.__drawingLineStyleAction=async o=>{
    if(o.action==='inspect')return{status:'observed',before:current()};
    if(o.action==='save'){saves++;return{status:'save-requested-unverified',executed:true,saveAcknowledged:ack,saveNotice:ack?'保存成功':null};}
    const row=data.find(r=>r.id===o.rowId);assert.ok(row);assert.equal(o.existingEditAuthorized,true);
    const key=o.action==='rename'?'name':o.action==='colorIndex'?'color':o.action;row[key]=o.value;writes++;
    return{status:'edited-ui-only',executed:true,after:{...row}};
  };
  vm.runInNewContext(code,sandbox);
  return{run:o=>sandbox.__drawingLineStyleRuntime({expectedConfigName:'Fixture config',expectedCustomerName:'Fixture customer',...o}),counts:()=>({writes,saves,reloads}),rows:()=>data,session,sandbox};
}
test('web search submits input and includes results beyond the first page',async()=>{
  const f=fixture();const r=await f.run({configurationTask:'search',query:'Other',match:'contains'});
  assert.equal(r.status,'search-results-read');assert.equal(r.complete,true);assert.equal(r.styles.length,3);assert.equal(r.pagesRead,2);assert.equal(f.counts().writes,0);
});
test('pagination limit remains incomplete instead of claiming unique search scope',async()=>{
  const f=fixture();const r=await f.run({configurationTask:'search',query:'',maxPages:1,match:'contains'});assert.equal(r.complete,false);assert.equal(r.styles.length,2);
});
test('exact matching does not confuse a substring candidate',async()=>{
  const f=fixture();const r=await f.run({configurationTask:'search',query:'Target',match:'exact'});assert.deepEqual(Array.from(r.styles,r=>r.name),['Target']);
});
test('bound edit modifies only specified fields and receipt saves separately with fresh readback',async()=>{
  const f=fixture();const original={...f.rows()[1]};const changes={name:'Renamed target',lineType:'DASHED',scale:'200',colorIndex:'251'};
  const r=await f.run({configurationTask:'update',requestId:'fixture_edit_001',expectedStyle:original,changes});
  assert.equal(r.status,'style-fields-verified');assert.equal(r.style.widthMm,'0.13');assert.equal(r.saved,false);assert.equal(f.counts().saves,0);
  assert.equal((await f.run({configurationTask:'update',requestId:'fixture_edit_001',expectedStyle:original,changes})).status,'request-already-used');
  const s=await f.run({configurationTask:'save',receiptId:r.receiptId});assert.equal(s.status,'save-reload-scheduled');assert.equal(s.saved,false);assert.equal(f.counts().saves,1);
  const verified=await f.run({configurationTask:'verify',receiptId:r.receiptId});assert.equal(verified.saved,true);assert.equal(verified.serverApiVerified,false);assert.equal(verified.published,false);
  const reread=await f.run({configurationTask:'save',receiptId:r.receiptId});assert.equal(reread.saved,true);assert.equal(f.counts().saves,1);
});
test('CONTINUOUS scale, original changes and duplicate names stop before writes',async()=>{
  const a=fixture();assert.equal((await a.run({configurationTask:'update',requestId:'fixture_edit_002',expectedStyle:a.rows()[1],changes:{scale:'200'}})).status,'blocked');assert.equal(a.counts().writes,0);
  const b=fixture();assert.equal((await b.run({configurationTask:'update',requestId:'fixture_edit_003',expectedStyle:{...b.rows()[1],color:'255'},changes:{colorIndex:'251'}})).status,'blocked');assert.equal(b.counts().writes,0);
  const c=fixture();assert.equal((await c.run({configurationTask:'update',requestId:'fixture_edit_004',expectedStyle:c.rows()[1],changes:{name:'Other A'}})).status,'blocked');assert.equal(c.counts().writes,0);
});

test('a bound confirmation is completed once as part of the independent save',async()=>{
  const f=fixture();const edited=await f.run({configurationTask:'update',requestId:'fixture_confirm_001',expectedStyle:f.rows()[1],changes:{name:'Renamed'}});
  const original=f.sandbox.__drawingLineStyleAction;let confirmed=0;
  f.sandbox.__drawingLineStyleAction=async o=>{
    if(o.action==='confirmSave'){confirmed++;return{executed:true,status:'save-requested-unverified',saveAcknowledged:true,saveNotice:'保存成功'};}
    const r=await original(o);return o.action==='save'?{...r,saveAcknowledged:false,saveConfirmationPending:true}:r;
  };
  const saved=await f.run({configurationTask:'save',receiptId:edited.receiptId});assert.equal(saved.status,'save-reload-scheduled');assert.equal(confirmed,1);assert.equal(f.counts().saves,1);
  assert.equal((await f.run({configurationTask:'verify',receiptId:edited.receiptId})).saved,true);
});
test('missing save notice never reloads or repeats a write',async()=>{
  const f=fixture({ack:false});const r=await f.run({configurationTask:'update',requestId:'fixture_edit_005',expectedStyle:f.rows()[1],changes:{colorIndex:'251'}});
  const saved=await f.run({configurationTask:'save',receiptId:r.receiptId});assert.equal(saved.saved,false);assert.equal(f.counts().reloads,0);
  await f.run({configurationTask:'save',receiptId:r.receiptId});assert.equal(f.counts().saves,1);
});
test('changes to unrelated styles block saving the earlier receipt',async()=>{
  const f=fixture();const r=await f.run({configurationTask:'update',requestId:'fixture_edit_006',expectedStyle:f.rows()[1],changes:{colorIndex:'251'}});f.rows()[0].color='1';
  const saved=await f.run({configurationTask:'save',receiptId:r.receiptId});assert.equal(saved.status,'blocked');assert.equal(f.counts().saves,0);
});

test('an uncertain save without the pending confirmation cannot be resubmitted',async()=>{
  const f=fixture();const r=await f.run({configurationTask:'update',requestId:'fixture_recover_001',expectedStyle:f.rows()[1],changes:{colorIndex:'251'}});
  const key='drawingLineStyleEditV1:'+r.receiptId,record=JSON.parse(f.session.get(key));f.session.set(key,JSON.stringify({...record,phase:'save-attempt-recorded'}));
  const blocked=await f.run({configurationTask:'save',receiptId:r.receiptId});assert.equal(blocked.status,'blocked');assert.equal(f.counts().saves,0);
});
test('MCP validates snapshots and patch fields before dispatch and legacy load cannot carry extra tasks',async()=>{
  let calls=0;const dispatch=createProtocol({page:async()=>{calls++;return{};}});
  const r=await dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'drawing_update_line_style',arguments:{pageId:'fixture',expectedConfigName:'config',expectedCustomerName:'customer',requestId:'fixture_edit_007',expectedStyle:style('1','Target'),changes:{delete:'true'}}}});assert.equal(r.error.code,-32602);assert.equal(calls,0);
  const invalid=await dispatch({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'drawing_load_customer_config',arguments:{pageId:'fixture',customerName:'customer',expectedStatus:'status',mode:'inspect',configurationTask:'update'}}});assert.equal(invalid.error.code,-32602);
});
test('save orchestration verifies after reload without resending save',async()=>{
  const tasks=[];const broker={page:async(id,op,args)=>{tasks.push(args.configurationTask);return args.configurationTask==='save'?{status:'save-reload-scheduled'}:{status:'save-and-reload-readback-verified',saved:true};}};
  const r=await dispatchLineStyleTool(broker,'drawing_save_line_style',{pageId:'fixture',expectedCustomerName:'customer'});assert.equal(r.saved,true);assert.deepEqual(tasks,['save','verify']);
});

test('refresh returning to the operator can restore the same customer once before readback',async()=>{
  const tasks=[];let restored=false;
  const broker={page:async(id,op,args)=>{
    if(!args.configurationTask){assert.equal(args.customerName,'Fixture customer');assert.equal(args.expectedStatus,'operator initial state');restored=true;tasks.push('restore');return{loaded:true,selectedTemplate:'Fixture config'};}
    tasks.push(args.configurationTask);
    if(args.configurationTask==='save')return{status:'save-reload-scheduled'};
    return restored?{status:'save-and-reload-readback-verified',saved:true}:{status:'customer-reload-required',currentStatus:'operator initial state'};
  }};
  const r=await dispatchLineStyleTool(broker,'drawing_save_line_style',{pageId:'fixture',expectedConfigName:'Fixture config',expectedCustomerName:'Fixture customer'});
  assert.equal(r.saved,true);assert.equal(r.customerReattached,true);assert.deepEqual(tasks,['save','verify','restore','verify']);
});
test('checked-in configuration bundle includes the current source adapters',()=>{
  const bundle=fs.readFileSync(new URL('../browser-extension/customer-load-page.js',import.meta.url),'utf8');assert.ok(bundle.endsWith(code));
  const action=fs.readFileSync(new URL('../browser-extension/line-style-actions.js',import.meta.url),'utf8').replace('export async function lineStyleAction(options = {}) {','globalThis.__drawingLineStyleAction = async function(options = {}) {');assert.ok(bundle.includes(action));
});

test('only a matching created draft is acknowledged after saved edit readback',async()=>{
 const f=fixture(),drafts={'line-draft:fixture_new_01':{created:true,saved:false,status:'needs-review',style:{...f.rows()[1]}},'line-draft:fixture_other_01':{created:true,saved:false,status:'draft-fields-verified',style:{...f.rows()[0]}}};
 f.sandbox.chrome={storage:{local:{get:async()=>drafts,set:async values=>Object.assign(drafts,values)}}};
 const edit=await f.run({configurationTask:'update',requestId:'fixture_draft_edit_01',expectedStyle:{...f.rows()[1]},changes:{widthMm:'0.50'}});
 assert.equal(drafts['line-draft:fixture_new_01'].saved,false);
 await f.run({configurationTask:'save',receiptId:edit.receiptId});assert.equal(drafts['line-draft:fixture_new_01'].saved,false);
 const r=await f.run({configurationTask:'verify',receiptId:edit.receiptId});assert.equal(r.persistedReadback,true);assert.equal(drafts['line-draft:fixture_new_01'].saved,true);assert.equal(drafts['line-draft:fixture_new_01'].style.widthMm,'0.50');assert.equal(drafts['line-draft:fixture_other_01'].saved,false);
});
