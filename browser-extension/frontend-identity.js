import {pageRole} from './pages.js';

// Dedicated, read-only page operation. The bundled adapter is injected afresh on every call.
export async function readFrontendIdentity({chromeApi,tabId,args}) {
  const tab=await chromeApi.tabs.get(tabId);
  if(pageRole(tab.url)!=='design')throw Error('Select a connected design page');
  const target=args.action==='inspect'?{tabId,allFrames:true}:{tabId,frameIds:[args.frameId??0]};
  await chromeApi.scripting.executeScript({target,files:['frontend-identity-page.js']});
  const probes=await chromeApi.scripting.executeScript({target,func:async options=>{
    if(typeof globalThis.__drawingReadFrontendIdentity!=='function')throw Error('Frontend identity adapter unavailable');
    return globalThis.__drawingReadFrontendIdentity(options);
  },args:[args]});
  if((await chromeApi.tabs.get(tabId)).url!==tab.url)throw Error('Design page changed during identity read');
  if(args.action==='inspect'){
    const frames=probes.filter(p=>p.result).map(p=>({frameId:p.frameId??0,...p.result}));
    if(!frames.length)throw Error('Frontend identity read returned no result');
    return{tabId,status:'identity-inspected',saved:false,published:false,identityVerified:false,frames};
  }
  const probe=probes.find(p=>(p.frameId??0)===(args.frameId??0));
  if(!probe?.result)throw Error('Frontend identity read returned no result');
  if(chromeApi.storage?.session&&args.cacheResult!==false){
    await chromeApi.storage.session.set({['frontendIdentity:'+tabId]:{url:tab.url,readAt:Date.now(),value:probe.result}});
  }
  return{tabId,frameId:probe.frameId??0,...probe.result};
}
