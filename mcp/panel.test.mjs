import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {startPanel} from '../browser-extension/panel.js';
import {readPanelPage,pageId,sourceName} from '../browser-extension/panel-data.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function ui({pages=[{tabId:7,role:'design',connected:true,title:'设计页',pageId:'profile-id:7'}],read=async()=>({tabId:7,role:'design',url:'https://www.kujiale.com/tool/h5/bim',frontend:{companyDisplayName:'示例企业',visibleAccountId:'EXAMPLE123',readAt:new Date().toISOString()}})}={}){
  const elements=new Map(),listeners={},timers=[];
  class Element{
    constructor(){this.children=[];this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.listeners={};}
    set innerHTML(_value){throw Error('Render untrusted page text with textContent');}
    get options(){return this.children;}
    replaceChildren(){this.children=[];}
    append(child){this.children.push(child);}
    addEventListener(type,fn){this.listeners[type]=fn;}
  }
  const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:()=>new Element()};
  const event=name=>({addListener(fn){listeners[name]=fn;},removeListener(){}});
  const api={runtime:{sendMessage:async()=>({connected:true,checkedAt:Date.now()})},tabs:{onRemoved:event('removed'),onCreated:event('created'),onReplaced:event('replaced'),onUpdated:event('updated')},windows:{onRemoved:event('windowRemoved')}};
  const state={pages};
  const panel=startPanel({document,api,window:{addEventListener(){},removeEventListener(){}},read,list:async()=>({browser:'Edge',clientId:'profile-id',pages:state.pages}),setTimer:fn=>{timers.push(fn);return timers.length;},clearTimer(){},setRepeating:()=>1,clearRepeating(){}});
  return{elements,listeners,timers,state,panel};
}
test('account ID and technical page IDs occupy separate fields',async()=>{
  const f=ui();await flush();assert.equal(f.elements.get('accountId').textContent,'EXAMPLE123');assert.equal(f.elements.get('pageId').textContent,'profile-id:7');assert.equal(f.elements.get('clientId').textContent,'profile-id');assert.equal(f.elements.get('tabId').textContent,'7');assert.equal(f.elements.get('browser').textContent,'Edge');assert.equal(f.elements.get('sourceRow').hidden,true);f.panel.dispose();
});
test('backend customer ID is not inferred from operator or source display names',async()=>{
  const f=ui({pages:[{tabId:1,role:'config',connected:true,pageId:'profile-id:1'}],read:async()=>({tabId:1,role:'config',readAt:new Date().toISOString(),identity:{accountDisplayName:'示例操作员',accountId:null,configOwnerId:null,configName:'示例模板',configStatusText:'当前 基础配置 来自于 示例客户 2026-01-01 12:00:00'}})});await flush();assert.equal(f.elements.get('company').textContent,'示例操作员');assert.equal(f.elements.get('source').textContent,'示例客户');assert.equal(f.elements.get('accountId').textContent,'未读取');assert.equal(f.elements.get('sourceId').textContent,'未读取');assert.equal(f.elements.get('template').textContent,'示例模板');assert.equal(f.elements.get('readIdentity').hidden,true);f.panel.dispose();
});
test('closing a page clears identity immediately and discards late reads',async()=>{
  let resolve;const f=ui({read:()=>new Promise(r=>{resolve=r;})});await flush();f.state.pages=[];f.listeners.removed(7);assert.equal(f.elements.get('accountId').textContent,'未读取');f.timers.shift()();await flush();resolve({tabId:7,role:'design',frontend:{companyDisplayName:'旧页面',visibleAccountId:'STALE_ID'}});await flush();assert.equal(f.elements.get('accountId').textContent,'未读取');assert.equal(f.elements.get('pageId').textContent,'未读取');f.panel.dispose();
});
test('UI renders page account labels as plain text',async()=>{
  const value='<img src=x onerror=alert(1)>';const f=ui({read:async()=>({tabId:7,role:'design',frontend:{companyDisplayName:value,visibleAccountId:'EXAMPLE123'}})});await flush();assert.equal(f.elements.get('company').textContent,value);f.panel.dispose();
});
test('popup and sidepanel expose the same minimal controls without obsolete diagnostics',()=>{
  for(const file of ['popup.html','sidepanel.html']){
    const html=fs.readFileSync(new URL('../browser-extension/'+file,import.meta.url),'utf8');
    for(const id of ['pages','accountId','sourceId','pageId','clientId','refresh','connect','readIdentity'])assert.ok(html.includes('id="'+id+'"'));
    for(const id of ['fullconfig','templates','observe','captureStart','captureStop','collectColor','collectOptions','reloadOptionsExtension','disconnect'])assert.equal(html.includes('id="'+id+'"'),false);
  }
});
test('page identifiers require a browser profile and source names require the actual source label',()=>{
  assert.equal(pageId(null,7),null);assert.equal(pageId('profile',7),'profile:7');assert.equal(sourceName('示例操作员'),null);assert.equal(sourceName('当前 基础配置 来自于 示例客户 2026-01-01 12:00:00'),'示例客户');
});
test('panel refuses a selected tab that navigated away from a supported design/config page',async()=>{
  let called=false;await assert.rejects(readPanelPage(1,{api:{tabs:{get:async()=>({url:'https://www.kujiale.com/login'})},scripting:{executeScript:async()=>{called=true;}}}}),/切换/);assert.equal(called,false);
});
