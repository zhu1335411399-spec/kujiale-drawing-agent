import test from 'node:test';import assert from 'node:assert/strict';
import {createProtocol} from './protocol.mjs';import {dispatchAnnotationTool} from './annotation-dispatch.mjs';
const target={pageId:'fixture',expectedConfigName:'Config',expectedCustomerName:'Customer',annotationKind:'text'};
test('creation uses a fixed annotation operation and bound browser name input',async()=>{
 const r=await dispatchAnnotationTool({page:async(id,op,args)=>{assert.equal(op,'load-customer-config');assert.equal(args.configurationTask,'update');assert.equal(args.styleDomain,'annotation');assert.equal(args.annotationTask,'create');assert.equal(args.changes.name,'Example');return{status:'annotation-draft-verified'};}},'drawing_create_annotation_style',{...target,requestId:'fixture_create_01',name:'Example'});assert.equal(r.status,'annotation-draft-verified');
});
test('invalid category fields, snapshots and duplicate save receipts never reach the browser',async()=>{
 let calls=0;const dispatch=createProtocol({page:async()=>{calls++;}});
 for(const [name,args]of[
 ['drawing_update_annotation_style',{...target,annotationKind:'leader',requestId:'fixture_edit_01',expectedStyle:{id:'1',name:'A'},changes:{fontSize:'4'}}],
 ['drawing_update_annotation_style',{...target,requestId:'fixture_edit_02',expectedStyle:{id:'1',name:'A'},changes:{delete:'true'}}],
 ['drawing_save_annotation_styles',{pageId:'fixture',expectedConfigName:'Config',expectedCustomerName:'Customer',receiptIds:['fixture_one','fixture_one']}]
 ]){const r=await dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});assert.equal(r.error.code,-32602);}assert.equal(calls,0);
});
test('save refresh restores only the original customer before verifying without resubmitting',async()=>{
 const tasks=[];let restored=false;const broker={page:async(id,op,a)=>{if(!a.annotationTask){restored=true;tasks.push('restore');return{loaded:true,selectedTemplate:'Config'};}tasks.push(a.annotationTask);return a.annotationTask==='save'?{status:'annotation-save-reload-scheduled'}:restored?{status:'annotation-save-verified',saved:true}:{status:'customer-reload-required',currentStatus:'operator'};}};
 const r=await dispatchAnnotationTool(broker,'drawing_save_annotation_styles',{pageId:'fixture',expectedConfigName:'Config',expectedCustomerName:'Customer',receiptIds:['fixture_one']});assert.equal(r.saved,true);assert.deepEqual(tasks,['save','verify','restore','verify']);
});
