import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withTrustedLineInputs} from '../browser-extension/trusted-line-input.js';

function fixture({blocked=false,requestValue='251',requestError=null}={}){
  const commands=[];let attached=0,detached=0,resolveRun,rejectRun;
  const req={nonce:'fixture-input',field:'colorIndex',value:requestValue,rowId:'fixture-row',x:100,y:100,...(requestError?{error:requestError}:{})};
  const chromeApi={tabs:{get:async()=>({url:'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style'})},debugger:{attach:async()=>{attached++;if(blocked)throw Error('Already attached');},detach:async()=>{detached++;},sendCommand:async(t,name,args)=>{commands.push({name,args});}},scripting:{executeScript:async o=>{
    const arg=o.args?.[0];
    if(arg?.nonce){arg.error?rejectRun(Error(arg.error)):resolveRun({ok:true});return[{}];}
    if(o.args?.length)return[{result:req}];
    return[{}];
  }}};
  const run=()=>new Promise((resolve,reject)=>{resolveRun=resolve;rejectRun=reject;});
  return{chromeApi,tabId:1,values:{colorIndex:'251'},target:{expectedCustomerName:'Fixture customer',expectedConfigName:'Fixture config'},run,counts:()=>({attached,detached,commands})};
}
test('authorized input inserts only the requested text and releases its debugger session',async()=>{
  const f=fixture();assert.equal((await withTrustedLineInputs(f)).ok,true);assert.equal(f.counts().attached,1);assert.equal(f.counts().detached,1);assert.deepEqual(f.counts().commands.filter(c=>c.name==='Input.insertText').map(c=>c.args.text),['251']);
});
test('a different value is rejected before browser input',async()=>{
  const f=fixture({requestValue:'255'});await assert.rejects(withTrustedLineInputs(f),/authorized/);assert.equal(f.counts().commands.length,0);assert.equal(f.counts().detached,1);
});
test('changed customer or input ownership prevents typing',async()=>{
  const f=fixture({requestError:'Input target or customer changed'});await assert.rejects(withTrustedLineInputs(f),/changed/);assert.equal(f.counts().commands.length,0);
});
test('does not detach somebody else or start editing when debugger attachment is blocked',async()=>{
  const f=fixture({blocked:true});let ran=false;f.run=async()=>{ran=true;};await assert.rejects(withTrustedLineInputs(f),/Already attached/);assert.equal(ran,false);assert.equal(f.counts().detached,0);
});
test('non-text changes do not acquire a debugger session',async()=>{
  const f=fixture();f.values={};f.run=async()=>({ok:true});assert.equal((await withTrustedLineInputs(f)).ok,true);assert.equal(f.counts().attached,0);
});
