import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createProtocol} from './protocol.mjs';
const code=fs.readFileSync(new URL('../browser-extension/style-inspection-page.js',import.meta.url),'utf8');
function fixture({customer='Fixture customer',existingDialog=false}={}){
 let tabClicks=0;
 const node=(label,attrs={})=>({innerText:label,tagName:'DIV',className:'',getClientRects:()=>[{}],getAttribute:k=>attrs[k]??null,querySelectorAll:()=>[],querySelector:()=>null,contains:()=>false,closest:()=>null});
 const status=node('当前 「基础配置」未发布来自于 '+customer+' 2026-01-01 12:00:00'),selected=node('Fixture config');
 const tab=node('通用设置',{'aria-selected':'false'});tab.click=()=>{tabClicks++;};
 const body=node('配色主题 深浅分别配置 只配深底 只配浅底'),dialog=node('Existing editor');
 const query=s=>s==='.ant-select-selection-item'?[selected]:s==='[role="tab"]'?[tab]:s==='[role="dialog"],.ant-modal,.ant-drawer-content'&&existingDialog?[dialog]:[];
 body.querySelectorAll=query;
 const sandbox={document:{body,querySelector:()=>status,querySelectorAll:query},location:{origin:'https://www.kujiale.com',pathname:'/pub/saas/workbench/construction/drawing_config/config/style',href:'fixture-url'},getComputedStyle:()=>({visibility:'visible'}),setTimeout:f=>f()};
 vm.runInNewContext(code,sandbox);
 return{run:a=>sandbox.__drawingStyleInspection({expectedConfigName:'Fixture config',expectedCustomerName:'Fixture customer',section:'general',action:'inspect',...a}),tabClicks:()=>tabClicks,dialog,node};
}
test('read-only section inspection changes the view without writing settings',async()=>{
 const f=fixture(),r=await f.run();assert.equal(r.status,'style-settings-observed');assert.equal(r.writesExecuted,false);assert.equal(r.saved,false);assert.equal(r.published,false);assert.equal(f.tabClicks(),1);
});
test('a different customer prevents even a section click',async()=>{
 const f=fixture({customer:'Other customer'}),r=await f.run();assert.equal(r.status,'blocked');assert.equal(f.tabClicks(),0);
});
test('an existing editor is read without navigating and cannot be cancelled as inspector-owned',async()=>{
 const f=fixture({existingDialog:true});assert.equal((await f.run()).status,'editor-observed');assert.equal(f.tabClicks(),0);
 assert.equal((await f.run({action:'close-editor'})).status,'blocked');
});

test('dimension line and extension line colors keep their observed section labels',async()=>{
 const f=fixture({existingDialog:true});f.dialog.innerText='编辑尺寸样式';
 const first=f.node('',{role:'spinbutton'}),second=f.node('',{role:'spinbutton'});for(const input of [first,second])input.matches=()=>false;
 const dimension=f.node('尺寸线'),extension=f.node('尺寸界线');dimension.compareDocumentPosition=()=>4;extension.compareDocumentPosition=n=>n===first?2:4;
 f.dialog.querySelectorAll=s=>s==='input,select,textarea,[role="switch"]'?[first,second]:s==='span,div,h1,h2,h3,h4,label'?[dimension,extension]:[];
 const r=await f.run();assert.equal(r.dialogs[0].editorType,'dimension');assert.deepEqual(Array.from(r.dialogs[0].fields,x=>x.section),['尺寸线','尺寸界线']);assert.equal(r.writesExecuted,false);
});
test('MCP registers only fixed read actions and preserves target binding during dispatch',async()=>{
 let calls=0;const dispatch=createProtocol({page:async(id,op,args)=>{calls++;assert.equal(id,'fixture');assert.equal(op,'load-customer-config');assert.equal(args.configurationTask,'inspect-style-settings');assert.equal(args.expectedCustomerName,'Fixture customer');return{status:'style-settings-observed',writesExecuted:false};}});
 const args={pageId:'fixture',expectedConfigName:'Fixture config',expectedCustomerName:'Fixture customer',section:'general',action:'inspect'};
 const r=await dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'drawing_inspect_style_settings',arguments:args}});assert.equal(r.result.isError,undefined);assert.equal(calls,1);
 const bad=await dispatch({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'drawing_inspect_style_settings',arguments:{...args,action:'rename'}}});assert.equal(bad.error.code,-32602);assert.equal(calls,1);
});
