export async function dispatchObjectTool(broker,name,args){
 const action={drawing_update_object_properties:'update-properties',drawing_replace_object_line_style:'replace-line',drawing_save_object_config:'save'}[name]||args.action;
 const call=a=>broker.page(args.pageId,'load-customer-config',{...args,action:a,customerName:args.expectedCustomerName,mode:'inspect',styleDomain:'object'});
 const first=await call(action);if(action!=='save'||first.saved||!['object-save-reload-scheduled','awaiting-fresh-page','customer-reload-required'].includes(first.status))return first;
 let restored=false,last;for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,300));try{last=await call('verify');if(last.saved)return{...last,customerReattached:restored};if(last.status==='customer-reload-required'&&!restored){const r=await broker.page(args.pageId,'load-customer-config',{customerName:args.expectedCustomerName,mode:'load',expectedStatus:last.currentStatus});if(!r.loaded||r.selectedTemplate!==args.expectedConfigName)throw Error('Original customer and template were not restored');restored=true;}}catch(e){last={error:e.message};}}
 return{...first,status:'object-save-unverified',saved:false,persistedReadback:false,error:last?.error||'Fresh object readback unavailable'};
}
