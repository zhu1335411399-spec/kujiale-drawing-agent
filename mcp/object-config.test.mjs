import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {validateCall} from './tools.mjs';
import {dispatchObjectTool} from './object-dispatch.mjs';

const target={pageId:'fixture:1',expectedConfigName:'Fixture template',expectedStatus:'Fixture status',expectedCustomerName:'Fixture customer',majorCategory:'建筑结构',rowId:'wall',trueCategory:'墙'};
const expectedProperties={selectable:{mode:'unmarked',value:false},sectionMode:{mode:'parent',value:'请选择'},hideSideElevation:{mode:'unmarked',value:false}};
test('object properties require a full snapshot, explicit inheritance and typed values',()=>{
 const call={...target,requestId:'object_fixture_01',expectedProperties,changes:{sectionMode:{mode:'custom',value:'剖到显示截面'},selectable:{mode:'custom',value:true}}};
 assert.doesNotThrow(()=>validateCall('drawing_update_object_properties',call));
 for(const changes of [{sectionMode:{mode:'custom',value:true}},{selectable:{mode:'unmarked',value:true}},{selectable:{mode:'parent',value:true}},{unknown:{mode:'custom',value:true}}])assert.throws(()=>validateCall('drawing_update_object_properties',{...call,changes}));
 assert.throws(()=>validateCall('drawing_update_object_properties',{...call,expectedProperties:{selectable:expectedProperties.selectable}}));
 assert.throws(()=>validateCall('drawing_replace_object_line_style',{...target,requestId:'style_fixture_01',theme:'light',styleField:'surfaceFill',expectedCellText:'old',replacementName:'new'}));
 assert.throws(()=>validateCall('drawing_save_object_config',{pageId:target.pageId,expectedConfigName:target.expectedConfigName,expectedStatus:target.expectedStatus,expectedCustomerName:target.expectedCustomerName,receiptIds:['fixture_01','fixture_01']}));
});

test('object save restores only the original customer and never repeats submission',async()=>{
 const calls=[];
 const broker={page:async(page,operation,args)=>{calls.push({page,operation,args});if(args.styleDomain!=='object')return{loaded:true,selectedTemplate:target.expectedConfigName};if(args.action==='save')return{status:'object-save-reload-scheduled'};return calls.some(x=>x.args.mode==='load')?{status:'object-save-verified',saved:true,persistedReadback:true}:{status:'customer-reload-required',currentStatus:'operator source without a time'};}};
 const result=await dispatchObjectTool(broker,'drawing_save_object_config',{...target,receiptIds:['fixture_01']});
 assert.equal(result.saved,true);assert.equal(result.customerReattached,true);
 assert.equal(calls.filter(x=>x.args.action==='save').length,1);assert.equal(calls.filter(x=>x.args.mode==='load').length,1);assert.equal(calls.find(x=>x.args.mode==='load').args.customerName,target.expectedCustomerName);
});

function runtime(phase='reload-scheduled'){
 const receipts=['fixture_01'],batch={phase,epoch:1,records:[{target:{expectedConfigName:target.expectedConfigName,expectedCustomerName:target.expectedCustomerName}}]};
 const memory=new Map([['drawingObjectSaveV1:'+receipts.join('|'),JSON.stringify(batch)]]);
 const context=vm.createContext({location:{origin:'https://www.kujiale.com',pathname:'/pub/saas/workbench/construction/drawing_config/config/object'},performance:{timeOrigin:2},sessionStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},document:{querySelector:()=>({innerText:'当前 「基础配置」未发布来自于 你的账号'}),querySelectorAll:()=>{throw Error('No configuration controls should be used before original customer restoration');}},setTimeout});
 vm.runInContext(fs.readFileSync(new URL('../browser-extension/object-write-runtime-page.js',import.meta.url),'utf8'),context);
 return()=>context.__drawingObjectWrite({...target,action:'save',receiptIds:receipts});
}
test('acknowledged save with a timestamp-free operator label requests restore without resaving',async()=>{
 const r=await runtime()();assert.equal(r.status,'customer-reload-required');assert.equal(r.executed,false);assert.equal(r.saved,false);
});
test('uncertain save confirmation is not submitted again',async()=>{
 const r=await runtime('save-confirmation-attempt-recorded')();assert.equal(r.status,'blocked');assert.equal(r.executed,false);assert.match(r.error,/already attempted/);
});
