import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('../browser-extension/frontend-identity-page.js',import.meta.url),'utf8');
function fixture({match=true,dialog=false}={}){
 let drawingOpen=true,exits=0;const calls=[];
 const body={},icon={getClientRects:()=>[{}],getBoundingClientRect:()=>({x:850,y:10,width:20,height:20}),parentElement:body,contains:n=>n===icon,closest:()=>({click(){exits++;drawingOpen=false;}})};
 const edit={id:'drawings-edit-views',classList:{contains:c=>c==='selected'},getClientRects:()=>drawingOpen?[{}]:[],getBoundingClientRect:()=>({x:10,y:10,width:60,height:20}),parentElement:body,contains:n=>n===edit};
 const box={document:{body,documentElement:{},title:'Fixture design',querySelectorAll:s=>s.startsWith('[id=')?drawingOpen?[edit]:[]:s==='i.tuipro-topbar-fixed-cancelicon'?[icon]:s.includes('[role="dialog"]')&&dialog?[{getClientRects:()=>[{}],getBoundingClientRect:()=>({x:0,y:0,width:10,height:10}),parentElement:body}]:[],elementFromPoint:x=>x<100?edit:icon},location:{origin:'https://www.kujiale.com',hostname:'www.kujiale.com',protocol:'https:',port:'',pathname:'/tool/h5/bim',href:'https://www.kujiale.com/tool/h5/bim'},performance:{timeOrigin:10},navigator:{userAgent:'Edg/120 Chrome/120'},innerWidth:1000,innerHeight:800,getComputedStyle:()=>({visibility:'visible',display:'block',opacity:'1'}),setTimeout:f=>f(),window:{}};
 vm.runInNewContext(script,box);const run=box.__drawingReadFrontendIdentity;
 box.__drawingReadFrontendIdentity=async args=>{calls.push(args);if(args.navigationTask==='open-drawing-workspace'){drawingOpen=true;return{navigationOutcome:'observed'};}if(args.navigationTask)return{navigationOutcome:'observed'};if(args.action==='inspect')return{avatarCandidates:[{accountAvatar:true,avatarKey:'avatar'}]};return{status:match?'display-name-match':'display-name-mismatch',companyDisplayName:match?'Fixture company':'Other company',visibleAccountId:'ACCOUNT-ID',readAt:'2026-11-20T00:00:00Z'};};
 return{run:()=>run({action:'hover',navigationTask:'refresh-account-in-drawing',expectedBrowser:'Edge',expectedCompanyName:'Fixture company',expectedTitle:'Fixture design'}),calls,exitCount:()=>exits,isDrawingOpen:()=>drawingOpen};
}
test('explicit account refresh exits, checks the avatar, and returns to the same drawing stage',async()=>{
 const f=fixture();const r=await f.run();assert.equal(r.navigationOutcome,'observed');assert.equal(r.companyDisplayName,'Fixture company');assert.equal(r.visibleAccountId,'ACCOUNT-ID');assert.equal(r.workspace.stage,'drawing-editor');assert.equal(f.exitCount(),1);assert.equal(f.isDrawingOpen(),true);
 assert.deepEqual(f.calls.map(x=>x.navigationTask||x.action),['inspect','hover','open-drawing-menu','open-drawing-workspace']);
});
test('account mismatch remains on the design page for review',async()=>{
 const f=fixture({match:false});const r=await f.run();assert.equal(r.navigationOutcome,'unconfirmed');assert.equal(f.isDrawingOpen(),false);assert.equal(f.calls.length,2);
});
test('an existing dialog blocks the exit',async()=>{
 const f=fixture({dialog:true});const r=await f.run();assert.equal(r.status,'identity-read-failed');assert.equal(f.exitCount(),0);assert.equal(f.isDrawingOpen(),true);
});
