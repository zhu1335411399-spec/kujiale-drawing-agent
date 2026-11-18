import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCustomerConfig } from '../browser-extension/load-customer-config.js';
import { createProtocol } from './protocol.mjs';
test('target and recorded drafts reach the inspection without removing them',async()=>{
  const stored={'line-draft:example':{created:true,saved:false,style:{id:'draft-1',name:'example'}}};
  let received;
  const result=await loadCustomerConfig({chromeApi:{storage:{local:{get:async()=>stored}},scripting:{executeScript:async o=>{if(o.files)return[{}];received=o.args[0];return[{result:{status:'dialog-inspected',loaded:false}}];}}},tabId:1,args:{customerName:'ExampleCustomer',expectedStatus:'expected',mode:'inspect'}});
  assert.equal(result.loaded,false);assert.equal(received.drafts[0].id,'draft-1');assert.equal(received.mode,'inspect');assert.equal(stored['line-draft:example'].saved,false);
});
test('load is a distinct operation and blocked results are errors',async()=>{
  let op;
  const dispatch=createProtocol({page:async(id,operation)=>{op=operation;return{status:'unconfirmed-drafts',loaded:false};}});
  const r=await dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'drawing_load_customer_config',arguments:{pageId:'test-page',customerName:'ExampleCustomer',expectedStatus:'expected',mode:'load'}}});
  assert.equal(op,'load-customer-config');assert.equal(r.result.isError,true);
});
test('complete customer label passes MCP validation and reaches the adapter',async()=>{
  let received;
  const dispatch=createProtocol({page:async(id,operation,args)=>{received=args;return{status:'already-loaded',loaded:true,submitted:false};}});
  const r=await dispatch({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'drawing_load_customer_config',arguments:{pageId:'test-page',customerName:'ExampleCustomer',customerLabel:'ExampleCustomer (a***@example.test)',expectedStatus:'expected',mode:'load'}}});
  assert.equal(r.result.isError,undefined);assert.equal(received.customerLabel,'ExampleCustomer (a***@example.test)');
});
