import {pageRole} from './pages.js';
import {readFrontendIdentity} from './frontend-identity.js';

// A compositor screenshot includes WebGL content even when the canvas drawing buffer has been cleared.
export async function captureFrontendView({chromeApi,tabId,args,readIdentity=readFrontendIdentity}){
 const base={status:'frontend-capture-blocked',captured:false,effectVerified:false,saved:false,published:false};
 let attached=false;
 try{
  const tab=await chromeApi.tabs.get(tabId);
  if(pageRole(tab.url)!=='design'||tab.title!==args.expectedTitle)throw Error('Target design changed before capture');
  const probe=()=>readIdentity({chromeApi,tabId,args:{...args,action:'hover',captureTask:'inspect',frameId:0,cacheResult:false}});
  const before=await probe();if(before.status!=='frontend-capture-ready')throw Error(before.error||'Drawing canvas preflight failed');
  const existing=await chromeApi.debugger.getTargets();if(existing.some(t=>t.tabId===tabId&&t.attached))throw Error('Target already has a debugger; close its DevTools before capture');
  await chromeApi.debugger.attach({tabId},'1.3');attached=true;
  const r=before.bounds,v=before.viewport,x=Math.max(0,r.x),y=Math.max(0,r.y),width=Math.min(v.width,r.x+r.width)-x,height=Math.min(v.height,r.y+r.height)-y;
  if(width<200||height<150)throw Error('Drawing canvas is not sufficiently visible');
  const metrics=await chromeApi.debugger.sendCommand({tabId},'Page.getLayoutMetrics');
  const viewport=metrics.cssLayoutViewport||metrics.layoutViewport;
  const clip={x:x+(viewport?.pageX||0),y:y+(viewport?.pageY||0),width,height,scale:Math.min(1,1280/(Math.max(width,height)*(v.devicePixelRatio||1)))};
  let data;
  for(const quality of [80,55]){const screenshot=await chromeApi.debugger.sendCommand({tabId},'Page.captureScreenshot',{format:'jpeg',quality,fromSurface:true,captureBeyondViewport:false,clip});data=screenshot?.data;if(data&&data.length<=200000)break;}
  if(!data||data.length>200000||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw Error('Compositor screenshot was unavailable or exceeded the response limit');
  const after=await probe(),current=await chromeApi.tabs.get(tabId);
  if(current.url!==tab.url||current.title!==tab.title||after.status!=='frontend-capture-ready'||after.documentEpoch!==before.documentEpoch||after.sceneId!==before.sceneId||['x','y','width','height'].some(k=>Math.abs(after.bounds[k]-r[k])>1))throw Error('Drawing document or canvas changed during capture');
  return{...base,status:'frontend-view-captured',captured:true,captureMethod:'browser-compositor',readAt:new Date().toISOString(),title:tab.title,sceneId:before.sceneId,bounds:r,clip,imageDataUrl:'data:image/jpeg;base64,'+data,accountEvidence:before.accountEvidence};
 }catch(error){return{...base,error:error.message};}
 finally{if(attached)await chromeApi.debugger.detach({tabId}).catch(()=>{});}
}
