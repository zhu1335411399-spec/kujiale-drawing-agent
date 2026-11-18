import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const adapter=readFileSync(new URL('../browser-extension/customer-load-page.js',import.meta.url),'utf8');
function fixture({labels=['示例客户 (a***@example.test)'],source='原客户',drafts=[],uncertain=false,missingPopup=false,virtual=false}={}) {
  class Element {
    constructor(value='',attrs={}){this.innerText=value;this.attrs=attrs;this.hidden=false;this.disabled=false;this.classList={contains:()=>false};}
    getClientRects(){return this.hidden?[]:[{}];}
    getAttribute(key){return this.attrs[key]??null;}
    querySelector(){return null;}
    querySelectorAll(){return [];}
    closest(){return null;}
    contains(){return false;}
    dispatchEvent(){}
    click(){this.action?.();}
    focus(){}
  }
  class Input extends Element {get value(){return this._value;}set value(v){this._value=v;}}
  let submits=0,selection='';
  const status=new Element(`当前 「基础配置」未发布来自于 ${source} 2026-01-01 12:00:00`);
  const dialog=new Element('载入配置 选择要载入的主账号：');
  const close=new Element('',{'aria-label':'Close'});close.action=()=>dialog.hidden=true;
  const confirm=new Element('载 入');confirm.action=()=>{submits++;if(!uncertain){status.innerText='当前 「基础配置」未发布来自于 示例客户 2026-01-02 12:00:00';dialog.hidden=true;}};
  const selected=new Element();
  const combo=new Input('',{'role':'combobox','aria-expanded':'true','aria-controls':'accounts'});combo.readOnly=false;
  const owner=new Element();
  owner.querySelector=s=>s.includes('selection-item')?Object.assign(selected,{innerText:selection}):null;
  combo.closest=()=>owner;
  const options=labels.map(s=>{const n=new Element(s);n.action=()=>selection=s;return n;});
  const popup=new Element();popup.closest=()=>popup;popup.querySelectorAll=()=>options;
  if(virtual){
    const scroller=new Element();let top=0;
    Object.defineProperty(scroller,'scrollTop',{get:()=>top,set:v=>top=Math.min(Math.max(0,v),scroller.scrollHeight-scroller.clientHeight)});
    scroller.clientHeight=100;scroller.scrollHeight=options.length*50;
    popup.querySelector=()=>scroller;popup.querySelectorAll=()=>options.slice(Math.floor(top/50),Math.floor(top/50)+2);
  }
  dialog.querySelectorAll=s=>s==='[role="combobox"]'?[combo]:s.includes('button')?[close,confirm]:[];
  dialog.contains=n=>[owner,combo,close,confirm].includes(n);
  const template=new Element('企业模板示例');
  const selector=new Element();selector.querySelector=s=>s.includes('combobox')?combo:template;
  const pagination=new Element();pagination.querySelector=selector.querySelector;pagination.closest=()=>new Element();
  const rows=drafts.map(d=>new Element('',{'data-row-key':d.id}));
  const document={querySelector:()=>status,getElementById:()=>missingPopup?null:popup,
    querySelectorAll:s=>s==='.ant-select'?[selector,pagination]:s==='tr[data-row-key]'?rows:s.includes('role="dialog"')?[dialog]:[]};
  const session=new Map();
  const sandbox={document,location:{origin:'https://www.kujiale.com',pathname:'/pub/saas/workbench/construction/drawing_config/config/style'},getComputedStyle:()=>({visibility:'visible'}),
    setTimeout:fn=>{fn();},Event:class{},MouseEvent:class{},HTMLInputElement:Input,performance:{timeOrigin:1},sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)}};
  vm.runInNewContext(adapter,sandbox);
  return {run:args=>sandbox.__drawingCustomerLoadPage({customerName:'示例客户',expectedStatus:status.innerText,mode:'load',drafts,...args}),submits:()=>submits,dialog,status,sandbox};
}

test('generic name selects a masked-email option, submits load, and reads default template',async()=>{
  const f=fixture();const r=await f.run();
  assert.equal(r.status,'source-label-verified');assert.equal(f.submits(),1);
  assert.equal(r.selectedTemplate,'企业模板示例');assert.equal(r.templateCandidates.length,1);
  assert.equal(r.saved,false);assert.equal(r.published,false);assert.equal(r.identityVerified,false);
});
test('same names require a complete label before submission',async()=>{
  const labels=['示例客户 (a***@example.test)','示例客户 (b***@example.test)'];
  const f=fixture({labels});const r=await f.run();assert.equal(r.status,'ambiguous-customer');assert.equal(f.submits(),0);
  const picked=fixture({labels});const p=await picked.run({customerLabel:labels[1]});assert.equal(p.status,'source-label-verified');assert.equal(p.matchedCustomerLabel,labels[1]);
});

test('load attempt protection distinguishes a new document from a duplicate submission',async()=>{
  const f=fixture({uncertain:true});await f.run();assert.equal(f.submits(),1);
  const duplicate=await f.run();assert.match(duplicate.error,/Prior load attempt/);assert.equal(f.submits(),1);
  f.sandbox.performance.timeOrigin=2;await f.run();assert.equal(f.submits(),2);
});
test('inspect never submits and current-account suffix is accepted',async()=>{
  const f=fixture({labels:['示例客户 (a***@example.test) 你的账号']});const r=await f.run({mode:'inspect'});
  assert.equal(r.status,'dialog-inspected');assert.equal(r.matchingCustomers.length,1);assert.equal(f.submits(),0);
});
test('already loaded name closes dialog without a second load',async()=>{
  const f=fixture({source:'示例客户'});const r=await f.run();
  assert.equal(r.status,'already-loaded');assert.equal(r.submitted,false);assert.equal(f.submits(),0);assert.equal(f.dialog.hidden,true);
});
test('missing customer, stale context and recorded drafts stop before load',async()=>{
  const missing=fixture({labels:['其他客户 (a***@example.test)']});assert.equal((await missing.run()).status,'customer-not-found');assert.equal(missing.submits(),0);
  const stale=fixture();assert.equal((await stale.run({expectedStatus:'stale'})).status,'inspection-failed');assert.equal(stale.submits(),0);
  const dirty=fixture({drafts:[{id:'example-draft'}]});assert.equal((await dirty.run()).status,'unconfirmed-drafts');assert.equal(dirty.submits(),0);
});
test('unconfirmed submission and missing dropdown never report success',async()=>{
  const f=fixture({uncertain:true});const r=await f.run();assert.equal(r.status,'load-outcome-unverified');assert.equal(r.loaded,false);assert.equal(r.submitted,true);
  const missing=fixture({missingPopup:true});assert.equal((await missing.run()).loaded,false);assert.equal(missing.submits(),0);
});
test('virtual customer list scans beyond first visible options and returns to select target',async()=>{
  const labels=Array.from({length:12},(_,i)=>`其他客户${i} (a***@example.test)`);labels[5]='示例客户 (target***@example.test)';
  const f=fixture({labels,virtual:true});const r=await f.run();assert.equal(r.status,'source-label-verified');assert.equal(f.submits(),1);
  const duplicate=[...labels];duplicate[10]='示例客户 (duplicate***@example.test)';
  const other=fixture({labels:duplicate,virtual:true});assert.equal((await other.run()).status,'ambiguous-customer');assert.equal(other.submits(),0);
});
