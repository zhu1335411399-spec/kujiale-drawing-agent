import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createProtocol} from './protocol.mjs';

const script=readFileSync(new URL('../browser-extension/frontend-identity-page.js',import.meta.url),'utf8');
function fixture({proof=true,open=false}={}){
 const clicks=[],body={children:[],textContent:'',getAttribute:()=>null,dispatchEvent(){}};let menuOpen=open;
 const node=(label,x=100)=>({tagName:'DIV',id:'',children:[],parentElement:body,innerText:label,isConnected:true,
  getAttribute:()=>null,getClientRects:()=>[{}],getBoundingClientRect:()=>({x,y:20,width:50,height:20}),
  contains(n){return this===n||this.children.some(c=>c.contains(n));},classList:{contains:()=>false},
  querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,
  dispatchEvent(){},click(){clicks.push(label);if(label==='settings-arrow')menuOpen=true;}});
 const hidden=node('设置'),settings=node('设置'),drop=node('settings-arrow',160),entry=node('施工图纸',220);
 const update=node('更新配置 有更新',300),template=node('切换施工图模板',400);
 const edit=node('编辑视图',500),layout=node('布局图纸',600);edit.id='drawings-edit-views';layout.id='drawings-generate-sheets';layout.classList.contains=c=>c==='selected';
 settings.closest=s=>s==='.tuipro-secondary-toolbar-icon-wrapper'?{querySelector:()=>drop}:null;
 const nodes=()=>[hidden,settings,drop,edit,layout,...(menuOpen?[update,template]:[])];
 const document={body,title:'Fixture design',documentElement:{},querySelectorAll(s){
  if(s.startsWith('[id='))return[edit,layout];
  if(s.startsWith('span,div,a,button'))return nodes();
  return[];
 },elementFromPoint(x){return nodes().find(n=>n!==hidden&&n.getBoundingClientRect().x+25===x)||body;}};
 const location={origin:'https://www.kujiale.com',hostname:'www.kujiale.com',protocol:'https:',port:'',pathname:'/tool/h5/bim',href:'https://www.kujiale.com/tool/h5/bim'};
 const box={document,location,performance:{timeOrigin:10},navigator:{userAgent:'Chrome/120 Edg/120'},innerWidth:1200,innerHeight:800,window:{},getComputedStyle:()=>({visibility:'visible'}),setTimeout:f=>f(),MouseEvent:class{constructor(type){this.type=type;}}};
 if(proof)box.__drawingAccountDisplayProof={url:location.href,documentEpoch:10,checkedAt:Date.now()-60000,companyDisplayName:'Fixture company'};
 vm.runInNewContext(script,box);
 return{box,clicks,run:args=>box.__drawingReadFrontendIdentity({expectedBrowser:'Edge',expectedCompanyName:'Fixture company',expectedTitle:'Fixture design',action:'hover',drawingTask:'inspect',navigationTask:'open-settings',...args})};
}

test('settings targets the exposed dropdown arrow, and an already open menu is not toggled',async()=>{
 const f=fixture();const r=await f.run();assert.equal(r.navigationOutcome,'observed');assert.deepEqual(f.clicks,['settings-arrow']);assert.equal(r.accountEvidence.stale,true);assert.equal(r.accountEvidence.scope,'navigation-only');assert.equal(r.workspace.stage,'drawing-layout');assert.equal(r.workspace.templateVerified,false);
 const again=await f.run();assert.equal(again.navigationExecuted,false);assert.equal(again.navigationOutcome,'observed');assert.deepEqual(f.clicks,['settings-arrow']);
});
test('unmatched account, changed document, and unsupported actions never click',async()=>{
 for(const prepare of [f=>{delete f.box.__drawingAccountDisplayProof;},f=>{f.box.performance.timeOrigin=11;},f=>{f.box.__drawingAccountDisplayProof.companyDisplayName='Other company';}]){
  const f=fixture();prepare(f);assert.equal((await f.run()).status,'identity-read-failed');assert.deepEqual(f.clicks,[]);
 }
 for(const navigationTask of ['update-configuration','open-template-selector','save','publish']){const f=fixture();assert.equal((await f.run({navigationTask})).status,'identity-read-failed');assert.deepEqual(f.clicks,[]);}
});
test('MCP rejects unsupported navigation and reports an unconfirmed outcome as an error',async()=>{
 let calls=0;const dispatch=createProtocol({page:async()=>{calls++;return{status:'frontend-navigation-observed',navigationOutcome:'unconfirmed'};}});
 const args={pageId:'fixture-page',expectedBrowser:'Edge',expectedCompanyName:'Fixture company',expectedTitle:'Fixture design',action:'open-settings'};
 const r=await dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'drawing_frontend_navigation',arguments:args}});assert.equal(r.result.isError,true);
 const bad=await dispatch({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'drawing_frontend_navigation',arguments:{...args,action:'open-template-selector'}}});assert.equal(bad.error.code,-32602);assert.equal(calls,1);
});
