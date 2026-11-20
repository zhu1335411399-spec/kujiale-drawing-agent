// Export only the currently exposed drawing canvas. No app internals, browser tabs or unrelated windows.
globalThis.__drawingCaptureFrontendView=async function(o){
 const result={status:'frontend-capture-blocked',captured:false,effectVerified:false,saved:false,published:false,documentVisibility:document.visibilityState,platformCapture:{runtimeReload:typeof globalThis.chrome?.runtime?.reload==='function',debugger:typeof globalThis.chrome?.debugger?.attach==='function',tabsCapture:typeof globalThis.chrome?.tabs?.captureVisibleTab==='function'}};
 try{
  const proof=globalThis.__drawingAccountDisplayProof;
  if(!proof||proof.url!==location.href||proof.documentEpoch!==performance.timeOrigin||proof.companyDisplayName!==o.expectedCompanyName?.trim()||document.title!==o.expectedTitle)throw Error('Confirm the displayed account and design document before capture');
  const visible=n=>{if(!n?.getClientRects().length)return false;const r=n.getBoundingClientRect();if(r.width<=0||r.height<=0||r.x+r.width<=0||r.y+r.height<=0||r.x>=innerWidth||r.y>=innerHeight)return false;for(let p=n;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;}return true;};
  const exposed=n=>{if(!visible(n))return false;const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return!!top&&(top===n||n.contains(top)||(top!==document.body&&top!==document.documentElement&&top.contains(n)));};
  if([...document.querySelectorAll('[role="dialog"],.tui-modal-content,.ant-modal-content')].some(visible))throw Error('Close the dialog before capturing a drawing');
  const candidates=[...document.querySelectorAll('canvas')].filter(exposed).filter(n=>n.closest('[id^="scene2d-"]')&&n.getBoundingClientRect().width>=200&&n.getBoundingClientRect().height>=150&&n.width>0&&n.height>0);
  if(candidates.length!==1)throw Error('One exposed drawing canvas is required');
  const source=candidates[0],r=source.getBoundingClientRect();
  if(o.captureTask==='inspect')return{...result,status:'frontend-capture-ready',documentEpoch:performance.timeOrigin,sceneId:source.closest('[id^="scene2d-"]').id,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:globalThis.devicePixelRatio||1},accountEvidence:{companyDisplayName:proof.companyDisplayName,checkedAt:new Date(proof.checkedAt).toISOString(),stale:Date.now()-proof.checkedAt>30000,sameDocument:true,identityVerified:false}};
  const output=document.createElement('canvas'),ratio=Math.min(1,1280/Math.max(source.width,source.height));
  output.width=Math.round(source.width*ratio);output.height=Math.round(source.height*ratio);
  const context=output.getContext('2d',{willReadFrequently:true});if(!context)throw Error('Canvas export is unavailable');
  await new Promise(resolve=>{let done=false;const finish=()=>{if(!done){done=true;resolve();}};setTimeout(finish,500);requestAnimationFrame(finish);});
  context.drawImage(source,0,0,output.width,output.height);
  const pixels=context.getImageData(0,0,output.width,output.height).data;let red=0,ink=0,opaque=0,different=false;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i]!==pixels[0]||pixels[i+1]!==pixels[1]||pixels[i+2]!==pixels[2]||pixels[i+3]!==pixels[3])different=true;if(pixels[i+3]<20)continue;opaque++;if(pixels[i]<245||pixels[i+1]<245||pixels[i+2]<245)ink++;if(pixels[i]>180&&pixels[i+1]<100&&pixels[i+2]<100)red++;}
  if(!opaque)throw Error('Canvas export is transparent; no drawing pixels were captured');
  if(!different)throw Error('Canvas export is a uniform frame; rendered geometry was not captured');
  let image=output.toDataURL('image/png');for(const q of [.8,.6,.4]){if(image.length<=200000)break;image=output.toDataURL('image/jpeg',q);}
  if(image.length>200000)throw Error('Canvas export exceeds the bounded bridge response size');
  return{...result,status:'frontend-view-captured',captured:true,title:document.title,readAt:new Date().toISOString(),sceneId:source.closest('[id^="scene2d-"]').id,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},imageWidth:output.width,imageHeight:output.height,imageDataUrl:image,pixelSummary:{opaquePixels:opaque,nonWhitePixels:ink,redPixels:red},accountEvidence:{companyDisplayName:proof.companyDisplayName,checkedAt:new Date(proof.checkedAt).toISOString(),stale:Date.now()-proof.checkedAt>30000,sameDocument:true,identityVerified:false}};
 }catch(error){return{...result,error:error.message};}
};
