import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProtocol } from './protocol.mjs';
import { validateCall } from './tools.mjs';
const args={pageId:'page',requestId:'generic-001',expectedConfigName:'Example',expectedCustomerName:'ExampleOwner',name:'ExampleLine',lineType:'DOT',colorIndex:'255',widthMm:'0.09'};
test('generic arguments reach draft adapter without hardcoded line or account',async()=>{
  let received;
  const dispatch=createProtocol({page:async(...a)=>{received=a;return{status:'draft-fields-verified',saved:false,published:false,style:{name:a[2].name}};}});
  const r=await dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'drawing_create_line_draft',arguments:args}});
  assert.deepEqual(received,['page','create-line-draft',args]);assert.equal(r.result.isError,undefined);
});
test('partial edits are tool errors instead of false success',async()=>{
  const dispatch=createProtocol({page:async()=>({status:'needs-review',created:true,saved:false})});
  const r=await dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'drawing_create_line_draft',arguments:args}});
  assert.equal(r.result.isError,true);
});
test('invalid parameters fail before browser dispatch',()=>{
  for(const patch of [{colorIndex:'256'},{colorIndex:'rgb(0,0,0)'},{widthMm:'0'},{lineType:'eval()'},{name:' '},{requestId:'!'}])assert.throws(()=>validateCall('drawing_create_line_draft',{...args,...patch}));
});
