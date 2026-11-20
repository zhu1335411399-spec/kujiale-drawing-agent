import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createProtocol} from './protocol.mjs';
const script=readFileSync(new URL('../browser-extension/frontend-sync-page.js',import.meta.url),'utf8');
function fixture(){
 const url='https://www.kujiale.com/tool/h5/bim',clicks=[];
 const dialog={innerText:'切换施工图模板 当前使用的是「Fixture template」 企业模板 Fixture template 当前 默认 更新于 2026-11-19 12:00:00 行业模板 System',getClientRects:()=>[{}],contains:n=>n===dialog,querySelectorAll:()=>[]};
 const body={};const document={body,documentElement:{},title:'Fixture design',querySelectorAll:s=>s.startsWith('[role="dialog"]')?[dialog]:[]};
 const box={document,window:{},MouseEvent:class{constructor(type){this.type=type;}},location:{href:url},performance:{timeOrigin:10},getComputedStyle:()=>({visibility:'visible'}),__drawingAccountDisplayProof:{url,documentEpoch:10,companyDisplayName:'Fixture company',checkedAt:Date.now()},setTimeout:f=>f()};
 vm.runInNewContext(script,box);
 const args={expectedBrowser:'Edge',expectedCompanyName:'Fixture company',expectedTitle:'Fixture design',expectedTemplateName:'Fixture template',requestId:'fixture_sync_01'};
 return{box,args,dialog,clicks,run:action=>box.__drawingSyncFrontendConfig({...args,syncTask:action})};
}
test('template inspection requires the current enterprise template and matching document',async()=>{
 const f=fixture();const r=await f.run('inspect');assert.equal(r.status,'frontend-sync-inspected');assert.equal(r.template.type,'enterprise');assert.equal(r.configurationUpdated,false);
 f.box.performance.timeOrigin=11;assert.equal((await f.run('verify')).status,'frontend-sync-blocked');
 const g=fixture();g.args.expectedTemplateName='Other template';assert.equal((await g.run('inspect')).status,'frontend-sync-blocked');
});
test('a refresh is never resubmitted, and expired inspection cannot start a new update',async()=>{
 const f=fixture();await f.run('inspect');const rec=f.box.__drawingFrontendSyncRecords.get(f.args.requestId);rec.attempted=true;rec.phase='update-click-attempted';
 const r=await f.run('update');assert.equal(r.executed,false);assert.equal(r.submissionRepeated,false);assert.equal(r.configurationUpdated,false);
 rec.attempted=false;rec.checkedAt=Date.now()-130000;const expired=await f.run('update');assert.match(expired.error,/expired/);assert.equal(expired.executed,false);
});
test('confirmation with extra regeneration or manual overwrite scope is not accepted',async()=>{
 const f=fixture();await f.run('inspect');const rec=f.box.__drawingFrontendSyncRecords.get(f.args.requestId);rec.phase='awaiting-confirmation';f.dialog.innerText='更新配置 全部重新生成';rec.dialogText=f.dialog.innerText;
 const r=await f.run('confirm');assert.equal(r.executed,false);assert.match(r.error,/additional work/);
});
test('the observed start-update button is allowed only while full regeneration is explicitly unchecked',async()=>{
 for(const checked of [false,true]){const f=fixture();await f.run('inspect');let clicks=0;const label={innerText:'全部重新生成'};
  const checkbox={checked,getClientRects:()=>[{}],closest:()=>label,parentElement:label};
  const button={innerText:'开始更新',disabled:false,getClientRects:()=>[{}],getBoundingClientRect:()=>({x:10,y:10,width:30,height:20}),dispatchEvent(){},click(){clicks++;}};
  f.dialog.innerText='更新配置 全部重新生成 取消 开始更新';f.dialog.querySelectorAll=s=>s==='button'?[button]:s.startsWith('input')?[checkbox]:[];
  const rec=f.box.__drawingFrontendSyncRecords.get(f.args.requestId);rec.phase='awaiting-confirmation';rec.dialogText=f.dialog.innerText;
  const r=await f.run('confirm');assert.equal(clicks,checked?0:1);assert.equal(r.configurationUpdated,false);assert.equal(checkbox.checked,checked);
  if(!checked){assert.equal(r.fullRegenerationSelected,false);await f.run('confirm');assert.equal(clicks,1);}
 }
});
test('a newly captured real success phrase can verify only the submitted task',async()=>{
 const f=fixture();await f.run('inspect');const rec=f.box.__drawingFrontendSyncRecords.get(f.args.requestId);rec.notices=['成功应用最新配置'];
 assert.equal((await f.run('verify')).configurationUpdated,false);rec.attempted=true;rec.confirmAttempted=true;
 const v=await f.run('verify');assert.equal(v.configurationUpdated,true);assert.equal(v.updateNotice,'成功应用最新配置');assert.equal(v.effectVerified,false);
});
test('historical account evidence cannot start a configuration refresh',async()=>{
 const f=fixture();await f.run('inspect');f.box.__drawingAccountDisplayProof.checkedAt=Date.now()-130000;
 const r=await f.run('update');assert.equal(r.executed,false);assert.match(r.error,/historical identity/);
});
test('the hot-injected frontend bundle includes the current refresh adapter',()=>{
 const bundled=readFileSync(new URL('../browser-extension/frontend-identity-page.js',import.meta.url),'utf8');assert.ok(bundled.endsWith(script));
});
test('MCP routes only the fixed refresh action and rejects arbitrary payloads',async()=>{
 const calls=[],dispatch=createProtocol({page:async(pageId,operation,args)=>{calls.push({pageId,operation,args});return{status:'frontend-sync-unconfirmed',configurationUpdated:false};}});
 const args={...fixture().args,pageId:'fixture-page',action:'verify'};
 const r=await dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'drawing_sync_frontend_configuration',arguments:args}});
 assert.equal(JSON.parse(r.result.content[0].text).configurationUpdated,false);assert.equal(calls[0].operation,'frontend-identity');assert.equal(calls[0].args.syncTask,'verify');assert.equal(calls[0].args.frameId,0);
 const invalid=await dispatch({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'drawing_sync_frontend_configuration',arguments:{...args,url:'https://example.com'}}});assert.equal(invalid.error.code,-32602);assert.equal(calls.length,1);
});
