import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../browser-extension/frontend-capture-page.js',import.meta.url),'utf8');
function fixture(){
 let exports=0;const source={width:900,height:600,parentElement:null,getClientRects:()=>[{}],getBoundingClientRect:()=>({x:0,y:0,width:900,height:600}),closest:()=>({id:'scene2d-fixture'}),contains:()=>false};
 const output={getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray([255,0,0,255,255,255,255,255])})}),toDataURL:type=>{exports++;return type==='image/png'?'x'.repeat(200001):'data:image/jpeg;base64,c21hbGw=';}};
 const document={title:'Fixture design',body:{},documentElement:{},elementFromPoint:()=>source,querySelectorAll:s=>s==='canvas'?[source]:[],createElement:()=>output};
 const url='https://www.kujiale.com/tool/h5/bim',box={document,setTimeout,requestAnimationFrame:f=>f(),location:{href:url},performance:{timeOrigin:1},innerWidth:1000,innerHeight:800,getComputedStyle:()=>({visibility:'visible'}),__drawingAccountDisplayProof:{url,documentEpoch:1,companyDisplayName:'Fixture company',checkedAt:Date.now()}};
 vm.runInNewContext(script,box);return{box,exports:()=>exports,run:o=>box.__drawingCaptureFrontendView({expectedCompanyName:'Fixture company',expectedTitle:'Fixture design',...o})};
}
test('canvas export is response-bounded and does not claim object-effect verification',async()=>{const f=fixture(),r=await f.run();assert.equal(r.captured,true);assert.ok(r.imageDataUrl.length<=200000);assert.equal(f.exports(),2);assert.equal(r.effectVerified,false);assert.equal(r.pixelSummary.redPixels,1);});
test('a different account or document cannot export pixels',async()=>{const f=fixture();assert.equal((await f.run({expectedCompanyName:'Other company'})).captured,false);f.box.performance.timeOrigin=2;assert.equal((await f.run()).captured,false);assert.equal(f.exports(),0);});
