// Inject the bundled page adapter on each operation, rather than retaining its function in worker memory.
import {withTrustedLineInputs} from './trusted-line-input.js';
export async function loadCustomerConfig({chromeApi,tabId,args}) {
 if(args.configurationTask==='update'&&!args.trustedInputActive){
   return withTrustedLineInputs({chromeApi,tabId,values:{rename:args.changes?.name,scale:args.changes?.scale,colorIndex:args.changes?.colorIndex,...(args.styleDomain==='annotation'?{annotationName:args.name||args.changes?.name,fontSize:args.changes?.fontSize}:{})},target:args,
     run:()=>loadCustomerConfig({chromeApi,tabId,args:{...args,trustedInputActive:true}})});
 }
 if(!args.customerName?.trim()||args.customerName.length>200)throw Error('Customer display name required');
 const stored=await chromeApi.storage.local.get(null);
 const drafts=Object.entries(stored).filter(([k,v])=>k.startsWith('line-draft:')&&v?.created&&!v.saved&&v.style?.id).map(([,v])=>v.style);
 await chromeApi.scripting.executeScript({target:{tabId},files:['customer-load-page.js']});
 const [probe]=await chromeApi.scripting.executeScript({target:{tabId},func:async options=>{
  if(typeof globalThis.__drawingCustomerLoadPage!=='function')return{loaded:false,status:'adapter-unavailable'};
  return globalThis.__drawingCustomerLoadPage(options);
 },args:[{...args,drafts}]});
 if(!probe?.result)throw Error(probe?.error?.message||'No page result; load is not verified');
 return probe.result;
}
