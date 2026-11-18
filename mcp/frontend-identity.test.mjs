import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {readFrontendIdentity} from '../browser-extension/frontend-identity.js';
import {createProtocol} from './protocol.mjs';
import {Broker} from './broker.mjs';

const script=readFileSync(new URL('../browser-extension/frontend-identity-page.js',import.meta.url),'utf8');
function fixture({title='示例企业',tooltip=null,family='Edge',outsideName=null,ambiguous=false}={}){
  const events=[];
  const body={children:[],getAttribute:()=>null,parentElement:null};
  const make=(attrs={},tag='IMG')=>({tagName:tag,id:'',attrs,parentElement:body,children:[],isConnected:true,
    getAttribute(k){return this.attrs[k]??null;},getClientRects:()=>[{}],contains:()=>false,
    getBoundingClientRect:()=>({x:900,y:20,width:40,height:40}),
    dispatchEvent(e){events.push(e.type);if(e.type==='mouseover'&&tooltip)tipVisible=true;},
    click(){throw Error('Identity reader must never click');}});
  const avatar=make({class:'account-avatar',title});body.children.push(avatar);
  let tipVisible=false;
  const tip=Object.assign(make({},'DIV'),{innerText:tooltip,getClientRects:()=>tipVisible?[{}]:[],getBoundingClientRect:()=>({x:850,y:60,width:140,height:40})});
  const second=make({class:'second-avatar',title:'其他企业'});if(ambiguous)body.children.push(second);
  const document={body,querySelectorAll:s=>s.startsWith('img,')?(ambiguous?[avatar,second]:[avatar]):s.includes('tooltip')?[tip]:[],title:'design'};
  const box={document,navigator:{userAgent:family==='Edge'?'Chrome/120 Edg/120':'Chrome/120'},innerWidth:1000,window:{},
    location:{origin:'https://www.kujiale.com',hostname:'www.kujiale.com',protocol:'https:',port:'',pathname:'/tool/h5/bim',href:'https://www.kujiale.com/tool/h5/bim'},
    getComputedStyle:()=>({visibility:'visible'}),MouseEvent:class{constructor(type){this.type=type;}},setTimeout:f=>f()};
  if(outsideName)document.unrelatedText=outsideName;
  vm.runInNewContext(script,box);
  return {run:o=>box.__drawingReadFrontendIdentity({expectedBrowser:'Edge',expectedCompanyName:'示例企业',...o}),events,avatar};
}
test('inspect returns observed candidates without hover or clicks',async()=>{
  const f=fixture({ambiguous:true});const r=await f.run({action:'inspect'});
  assert.equal(r.status,'identity-inspected');assert.equal(r.candidateCount,2);assert.equal(f.events.length,0);assert.equal(r.companyDisplayName,null);
});
test('chosen avatar title is read and display name matched without identity-ID claims',async()=>{
  const f=fixture();const probe=await f.run({action:'inspect'});const r=await f.run({action:'hover',avatarKey:probe.avatarCandidates[0].avatarKey});
  assert.equal(r.status,'display-name-match');assert.equal(r.companyDisplayName,'示例企业');assert.equal(r.identityVerified,false);assert.equal(r.saved,false);assert.equal(r.published,false);
  assert.ok(f.events.includes('mouseover'));assert.ok(f.events.includes('mouseout'));
});
test('hover reads new nearby tooltip and cleans up mouse events',async()=>{
  const f=fixture({title:null,tooltip:'示例企业'});const probe=await f.run({action:'inspect'});const r=await f.run({action:'hover',avatarKey:probe.avatarCandidates[0].avatarKey});
  assert.equal(r.status,'display-name-match');assert.equal(r.evidence[0].source,'new-nearby-tooltip');assert.equal(f.events.at(-1),'mouseleave');
});
test('unrelated page text does not establish company identity',async()=>{
  const f=fixture({title:'头像',outsideName:'示例企业'});const p=await f.run({action:'inspect'});const r=await f.run({action:'hover',avatarKey:p.avatarCandidates[0].avatarKey});
  assert.equal(r.status,'identity-unconfirmed');assert.equal(r.companyDisplayName,null);
});
test('browser mismatch or changed avatar stops before hover',async()=>{
  const f=fixture({family:'Chrome'});assert.equal((await f.run({action:'inspect'})).status,'identity-read-failed');assert.equal(f.events.length,0);
  const g=fixture();const p=await g.run({action:'inspect'});g.avatar.attrs.class='changed';assert.equal((await g.run({action:'hover',avatarKey:p.avatarCandidates[0].avatarKey})).status,'identity-read-failed');assert.equal(g.events.length,0);
});
test('wrapper rejects config pages and checks navigation after reading',async()=>{
  let executions=0;
  await assert.rejects(readFrontendIdentity({tabId:1,args:{},chromeApi:{tabs:{get:async()=>({url:'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style'})},scripting:{executeScript:async()=>{executions++;}}}}),/design page/);assert.equal(executions,0);
  let reads=0;
  await assert.rejects(readFrontendIdentity({tabId:1,args:{action:'inspect'},chromeApi:{tabs:{get:async()=>({url:++reads===1?'https://www.kujiale.com/tool/h5/bim':'https://www.kujiale.com/other'})},scripting:{executeScript:async o=>o.files?[{}]:[{result:{status:'identity-inspected'}}]}}}),/changed/);
});
test('inspect reports frame IDs and hover targets only the selected frame',async()=>{
  const targets=[];const chromeApi={tabs:{get:async()=>({url:'https://www.kujiale.com/tool/h5/bim'})},scripting:{executeScript:async o=>{
    targets.push(o.target);if(o.files)return[{}];return o.target.allFrames?[{frameId:0,result:{status:'identity-inspected',avatarCandidates:[]}},{frameId:12,result:{status:'identity-inspected',avatarCandidates:[{avatarKey:'observed'}]}}]:[{frameId:12,result:{status:'display-name-match',companyDisplayName:'示例企业'}}];
  }}};
  const inspected=await readFrontendIdentity({chromeApi,tabId:1,args:{action:'inspect'}});assert.equal(inspected.frames[1].frameId,12);
  const hovered=await readFrontendIdentity({chromeApi,tabId:1,args:{action:'hover',frameId:12,avatarKey:'observed'}});assert.equal(hovered.status,'display-name-match');assert.deepEqual(targets.at(-1),{tabId:1,frameIds:[12]});
});
test('MCP exposes dedicated readonly tool and routes failed reads as errors',async()=>{
  let operation;
  const dispatch=createProtocol({page:async(id,op)=>{operation=op;return{status:'identity-read-failed'};}});
  const list=await dispatch({jsonrpc:'2.0',id:1,method:'tools/list'});assert.equal(list.result.tools.find(t=>t.name==='drawing_read_frontend_identity').annotations.readOnlyHint,true);
  const r=await dispatch({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'drawing_read_frontend_identity',arguments:{pageId:'sample-page',action:'inspect',expectedBrowser:'Edge',expectedCompanyName:'示例企业'}}});
  assert.equal(operation,'frontend-identity');assert.equal(r.result.isError,true);
});
test('browser family report survives polling and invalid report cannot replace known family',()=>{
  const broker=new Broker();const id='00000000-0000-4000-8000-000000000001',instance='00000000-0000-4000-8000-000000000002';
  broker.register(id,instance,{browser:'Edge'});broker.poll(id,instance);assert.equal(broker.clients.get(id).browser,'Edge');
  broker.register(id,instance,{browser:'unexpected'});assert.equal(broker.clients.get(id).browser,'Edge');broker.close();
});
