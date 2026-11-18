// Fixed operations share the configuration executor. Browser input requires the updated worker once.
export async function dispatchLineStyleTool(broker,name,args){
  const call=configurationTask=>broker.page(args.pageId,'load-customer-config',{
    ...args,customerName:args.expectedCustomerName,mode:'inspect',configurationTask,...(configurationTask==='update'&&['name','scale','colorIndex'].some(k=>args.changes?.[k]!==undefined)?{trustedInputRequired:true}:{})
  });
  if(name==='drawing_search_line_styles')return call('search');
  if(name==='drawing_update_line_style')return call('update');
  const submitted=await call('save');
  if(!['save-reload-scheduled','customer-reload-required','awaiting-fresh-page'].includes(submitted.status))return submitted;
  let last,customerReattached=false;
  for(let i=0;i<6;i++){
    await new Promise(resolve=>setTimeout(resolve,250));
    try{
      last=await call('verify');
      if(last.saved)return{...last,customerReattached};
      if(last.status==='customer-reload-required'){
        if(customerReattached)break;
        const loaded=await broker.page(args.pageId,'load-customer-config',{customerName:args.expectedCustomerName,expectedStatus:last.currentStatus,mode:'load'});
        if(!loaded.loaded||loaded.selectedTemplate!==args.expectedConfigName){last={error:loaded.error||'Original customer and selected configuration could not be restored after reload'};break;}
        customerReattached=true;continue;
      }
      if(last.status==='awaiting-fresh-page')continue;
      if(!/table not found|target could not|not the line-style|frame|context|script|no page/i.test(last.error||''))break;
    }catch(error){last={error:error.message};}
  }
  return{...submitted,status:'save-outcome-unverified',saved:false,persistedReadback:false,error:last?.error||'Fresh-page readback was not confirmed'};
}
