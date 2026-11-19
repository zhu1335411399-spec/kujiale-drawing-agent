export async function dispatchAnnotationTool(broker,name,args){
 const task={drawing_search_annotation_styles:'search',drawing_create_annotation_style:'create',drawing_update_annotation_style:'update',drawing_save_annotation_styles:'save'}[name];
 const call=annotationTask=>broker.page(args.pageId,'load-customer-config',{...args,customerName:args.expectedCustomerName,mode:'inspect',styleDomain:'annotation',annotationTask,configurationTask:['create','update'].includes(annotationTask)?'update':'annotation-read',...(['create','update'].includes(annotationTask)?{changes:args.changes||{name:args.name}}:{})});
 const first=await call(task);if(task!=='save'||first.saved||!['annotation-save-reload-scheduled','customer-reload-required','awaiting-fresh-page'].includes(first.status))return first;
 let restored=false,last;
 for(let i=0;i<8;i++){
  await new Promise(r=>setTimeout(r,250));
  try{last=await call('verify');if(last.saved)return{...last,customerReattached:restored};
   if(last.status==='customer-reload-required'&&!restored){const loaded=await broker.page(args.pageId,'load-customer-config',{customerName:args.expectedCustomerName,mode:'load',expectedStatus:last.currentStatus});if(!loaded.loaded||loaded.selectedTemplate!==args.expectedConfigName)throw Error('Original customer/configuration was not restored');restored=true;}
   else if(last.error&&!/target|configuration|context|frame|script|style section/i.test(last.error))break;
  }catch(e){last={error:e.message};}
 }
 return{...first,status:'annotation-save-unverified',saved:false,persistedReadback:false,error:last?.error||'Fresh annotation readback unavailable'};
}
