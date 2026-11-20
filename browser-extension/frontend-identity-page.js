// Reads rendered account labels only. Never reads cookies, tokens, storage, or application internals.
globalThis.__drawingReadFrontendIdentity=async function(options){
  const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' ');
  const clean=s=>(s||'').trim().replace(/\s+/g,' ');
  const visible=n=>{if(!n?.getClientRects().length)return false;const r=n.getBoundingClientRect();if(r.width<=0||r.height<=0||r.x+r.width<=0||r.y+r.height<=0||r.x>=innerWidth||(typeof innerHeight==='number'&&r.y>=innerHeight))return false;for(let p=n;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(s.visibility==='hidden'||s.display==='none'||s.opacity==='0')return false;}return true;};
  const exposed=n=>{if(!visible(n))return false;if(typeof document.elementFromPoint!=='function')return true;const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return!!top&&(top===n||n.contains(top)||(top!==document.body&&top!==document.documentElement&&top.contains(n)));};
  const workspace=()=>{const controls=[...document.querySelectorAll('[id="drawings-edit-views"],[id="drawings-generate-sheets"]')].filter(visible),selected=controls.filter(n=>exposed(n)&&n.classList.contains('selected'));return{stage:selected.length===1?(selected[0].id==='drawings-generate-sheets'?'drawing-layout':'drawing-editor'):controls.length?'drawing-unconfirmed':'design',drawingOpen:controls.length>0,templateVerified:false,configurationUpdated:false,effectVerified:false};};
  const browser=navigator.userAgent.includes('Edg/')?'Edge':navigator.userAgent.includes('Chrome/')?'Chrome':'unknown';
  const result={readerBuild:'frontend-identity-5',readAt:new Date().toISOString(),url:location.origin+location.pathname,browser,
    status:'identity-unconfirmed',companyDisplayName:null,visibleAccountId:null,displayNameMatch:null,identityVerified:false,saved:false,published:false,evidence:[]};
  const generic=new Set(['头像','用户头像','账号','账户','个人中心','用户中心','avatar','profile','account']);
  const usable=s=>!!clean(s)&&clean(s).length<=200&&!generic.has(clean(s).toLowerCase())&&!/https?:\/\//i.test(s);
  const rect=n=>{const r=n.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};};
  const key=n=>{
    const parts=[];let p=n;
    for(let i=0;p&&p!==document.body&&i<8;i++,p=p.parentElement){
      parts.unshift([p.tagName,p.id||'',p.getAttribute('class')||'',p.parentElement?[...p.parentElement.children].indexOf(p):0]);
    }
    return JSON.stringify(parts);
  };
  const isHeader=n=>{const r=n.getBoundingClientRect();return visible(n)&&r.width>0&&r.height>0&&r.width<=200&&r.height<=160&&r.y>=0&&r.y<160&&r.x>=innerWidth*.60;};
  const candidateNodes=()=>{
    const nodes=[...document.querySelectorAll('img,[class*="avatar"],[class*="Avatar"],[data-testid*="avatar"],[aria-label*="头像"]')].filter(isHeader);
    // An avatar wrapper and its image are one candidate, not two independently chosen targets.
    return nodes.filter(n=>!nodes.some(x=>x!==n&&n.contains(x)&&isHeader(x)));
  };
  const accountAvatar=n=>{for(let p=n,i=0;p&&p!==document.body&&i<5;p=p.parentElement,i++)if(/avatar|头像/i.test(['class','data-testid','aria-label'].map(k=>p.getAttribute(k)||'').join(' ')))return true;return false;};
  try{
    if(!['www.kujiale.com','beta.kujiale.com','yun.kujiale.com','yun-beta.kujiale.com'].includes(location.hostname)||
      location.protocol!=='https:'||location.port)throw Error('Not a supported design origin');
    if(!['inspect','hover'].includes(options.action))throw Error('Invalid identity-read action');
    if(browser!==options.expectedBrowser)throw Error('Connected browser family does not match the selected browser');
    result.workspace=workspace();
    if(options.captureTask)return globalThis.__drawingCaptureFrontendView(options);
    if(options.syncTask)return globalThis.__drawingSyncFrontendConfig(options);
    if(options.navigationTask==='refresh-account-in-drawing'){
      if(document.title!==options.expectedTitle)throw Error('Current design title changed before account refresh');
      const before=workspace(),originalUrl=location.href,epoch=performance.timeOrigin;
      if(!['drawing-editor','drawing-layout'].includes(before.stage))throw Error('Select an open drawing workspace before refreshing its account');
      const dialogs=()=>[...document.querySelectorAll('[role="dialog"],.ant-modal-content,.tui-modal-content')].filter(visible);
      if(dialogs().length)throw Error('Close the current dialog before leaving the drawing workspace');
      const exits=[...document.querySelectorAll('i.tuipro-topbar-fixed-cancelicon')].filter(exposed);
      if(exits.length!==1)throw Error('Unique drawing exit was not observed');
      const exit=exits[0].closest('button')||exits[0];exit.click();
      for(let i=0;i<20&&workspace().drawingOpen&&!dialogs().length;i++)await new Promise(r=>setTimeout(r,100));
      if(dialogs().length)throw Error('Drawing exit needs review; no confirmation was clicked');
      if(location.href!==originalUrl||performance.timeOrigin!==epoch||workspace().drawingOpen)throw Error('Drawing exit was not observed in the same design document');
      const inspect=await globalThis.__drawingReadFrontendIdentity({...options,navigationTask:undefined,drawingTask:undefined,action:'inspect'});
      const avatars=inspect.avatarCandidates?.filter(x=>x.accountAvatar);
      if(avatars?.length!==1)throw Error('A unique account avatar was not observed on the design page');
      const account=await globalThis.__drawingReadFrontendIdentity({...options,navigationTask:undefined,drawingTask:undefined,action:'hover',avatarKey:avatars[0].avatarKey});
      if(account.status!=='display-name-match')return{...account,status:'account-refresh-unconfirmed',navigationOutcome:'unconfirmed',workspace:workspace(),message:'设计页账号与预期不一致或无法确认；已停在设计页。'};
      const menu=await globalThis.__drawingReadFrontendIdentity({...options,navigationTask:'open-drawing-menu',drawingTask:'inspect',action:'hover'});
      if(menu.navigationOutcome!=='observed')return{...account,status:'account-refresh-unconfirmed',navigationOutcome:'unconfirmed',workspace:workspace(),message:'账号已确认，但未能观察到图纸菜单；已停在设计页。'};
      const drawing=await globalThis.__drawingReadFrontendIdentity({...options,navigationTask:'open-drawing-workspace',drawingTask:'inspect',action:'hover'});
      for(let i=0;i<20&&!workspace().drawingOpen;i++)await new Promise(r=>setTimeout(r,100));
      if((drawing.navigationOutcome!=='observed'&&!workspace().drawingOpen)||workspace().stage!==before.stage)return{...account,status:'account-refresh-unconfirmed',navigationOutcome:'unconfirmed',workspace:workspace(),message:'账号已确认，但未能核对返回原施工图工作区。'};
      return{...account,status:'frontend-navigation-observed',navigationTask:options.navigationTask,navigationOutcome:'observed',workspace:workspace(),accountEvidence:{companyDisplayName:account.companyDisplayName,visibleAccountId:account.visibleAccountId,checkedAt:account.readAt,sameDocument:true,stale:false,scope:'navigation-only'}};
    }
    if(options.navigationTask){
      const proof=globalThis.__drawingAccountDisplayProof;
      if(!proof||!Number.isFinite(proof.documentEpoch)||proof.url!==location.href||proof.documentEpoch!==globalThis.performance?.timeOrigin||proof.companyDisplayName!==clean(options.expectedCompanyName)||!Number.isFinite(proof.checkedAt)||proof.checkedAt>Date.now()||document.title!==options.expectedTitle)throw Error('Refresh and confirm the displayed account and current design before navigation');
      result.accountEvidence={companyDisplayName:proof.companyDisplayName,checkedAt:new Date(proof.checkedAt).toISOString(),sameDocument:true,stale:Date.now()-proof.checkedAt>30000,scope:'navigation-only'};
      if(!['open-drawing-menu','open-drawing-workspace','open-settings'].includes(options.navigationTask))throw Error('Unsupported frontend navigation');
      const label=options.navigationTask==='open-drawing-menu'?'图纸&清单':options.navigationTask==='open-settings'?'设置':'施工图纸';
      const labels=()=>[...document.querySelectorAll('span,div,a,button,[role="menuitem"]')].filter(exposed).map(text);
      const reached=()=>options.navigationTask==='open-drawing-menu'?labels().includes('施工图纸'):options.navigationTask==='open-settings'?labels().includes('切换施工图模板')&&labels().some(t=>/^更新配置(?:\s|$)/.test(t)):workspace().drawingOpen;
      result.navigationExecuted=false;
      if(!reached()){
      const all=[...document.querySelectorAll('span,div,a,button,[role="menuitem"]')].filter(exposed).filter(n=>text(n)===label);
      const matches=all.filter(n=>!all.some(x=>x!==n&&n.contains(x)));
      if(matches.length!==1)throw Error('Observed frontend entry is missing or ambiguous: '+label);
      const leaf=matches[0],drop=options.navigationTask==='open-settings'?leaf.closest('.tuipro-secondary-toolbar-icon-wrapper')?.querySelector('.tuipro-secondary-toolbar-icon-drop'):null;
      const node=drop&&exposed(drop)?drop:leaf,r=node.getBoundingClientRect();
      for(let p=node,i=0;p&&i<3;p=p.parentElement,i++){for(const type of ['mouseover','mouseenter'])p.dispatchEvent(new MouseEvent(type,{bubbles:type==='mouseover',clientX:r.x+r.width/2,clientY:r.y+r.height/2,view:window}));}
      await new Promise(r=>setTimeout(r,250));
      for(const type of ['mousedown','mouseup'])node.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:r.x+r.width/2,clientY:r.y+r.height/2,view:window}));
      node.click();result.navigationExecuted=true;result.navigationTask=options.navigationTask;await new Promise(r=>setTimeout(r,800));
      }
      if(location.href!==proof.url)throw Error('Frontend navigation changed the URL; re-read the page context');
      result.navigationTask=options.navigationTask;
      result.navigationOutcome=reached()?'observed':'unconfirmed';
    }
    if(options.drawingTask==='inspect'){
      const n=s=>[...document.querySelectorAll(s)].filter(visible);
      result.workspace=workspace();
      const iconEvidence=n('i,svg').filter(x=>/back|return|close|exit|fanhui|guanbi|tuichu/i.test((x.getAttribute('class')||'')+' '+(x.querySelector('use')?.getAttribute('xlink:href')||''))).slice(0,12).map(x=>({classes:x.getAttribute('class'),html:x.parentElement?.outerHTML.slice(0,5000)}));const nav=n('span,div,a,button').filter(x=>['布局图纸','编辑视图','去布局','设置','图纸&清单','返回','退出','模板'].includes(text(x))).filter(x=>![...x.children].some(c=>text(c)===text(x)));
      const entryText=/施工图|企业模板|选择模板|更新配置|^设置$|图纸&清单/;
      const entries=n('span,div,a,button,[role="menuitem"]').filter(exposed).filter(x=>text(x).length<80&&entryText.test(text(x))).filter(x=>![...x.children].some(c=>exposed(c)&&entryText.test(text(c))));
      result.fields=n('input,select,textarea,[role="combobox"],[role="switch"]').filter(x=>!['password','hidden'].includes(x.getAttribute('type'))&&!/password|token|secret|authorization/i.test((x.id||'')+' '+(x.getAttribute('name')||''))).slice(0,50).map(x=>({tag:x.tagName,type:x.getAttribute('type'),value:x.value??null,placeholder:x.getAttribute('placeholder'),label:x.getAttribute('aria-label'),context:text(x.parentElement).slice(0,220)}));
      result.templateControls=n('.tui-select,.ant-select,[role="listbox"]').slice(0,25).map(x=>({text:text(x).slice(0,220),context:text(x.parentElement).slice(0,300),classes:x.getAttribute('class')}));
      result.dialogs=n('[role="dialog"],.ant-modal-content,.tui-modal-content').map(x=>({text:text(x).slice(0,5000),buttons:[...x.querySelectorAll('button')].filter(visible).map(text)}));
      return{...result,status:options.navigationTask?'frontend-navigation-observed':'frontend-drawing-observed',title:document.title,text:text(document.body).slice(0,14000),viewEntries:n('span,div,a').filter(exposed).filter(x=>['厨卫柜体图纸','厨卫图纸','全屋家具柜体图纸','全屋家具空间图纸','平面布置图','编辑视图'].includes(text(x))).filter(x=>![...x.children].some(c=>text(c)===text(x))).map(x=>({label:text(x),classes:x.getAttribute('class'),html:x.parentElement?.parentElement?.outerHTML.slice(0,4500)})),renderSurfaces:n('canvas,svg').filter(exposed).filter(x=>{const r=x.getBoundingClientRect();return r.width>=200&&r.height>=150;}).map(x=>({tag:x.tagName,id:x.id,classes:x.getAttribute('class'),bounds:rect(x),width:x.getAttribute('width'),height:x.getAttribute('height'),parents:(()=>{const a=[];for(let p=x.parentElement,i=0;p&&p!==document.body&&i<4;p=p.parentElement,i++)a.push({tag:p.tagName,classes:p.getAttribute('class'),id:p.id});return a;})(),strokeColors:x.tagName.toLowerCase()==='svg'?[...x.querySelectorAll('path,line,polyline,polygon')].slice(0,5000).reduce((a,n)=>{const c=n.getAttribute('stroke')||getComputedStyle(n).stroke;if(c&&c!=='none')a[c]=(a[c]||0)+1;return a;},{}):null})),navigationCandidates:entries.slice(0,35).map(x=>({label:text(x),tag:x.tagName,classes:x.getAttribute('class'),bounds:rect(x),ancestors:(()=>{const a=[];for(let p=x,i=0;p&&p!==document.body&&i<5;p=p.parentElement,i++)a.push({tag:p.tagName,classes:p.getAttribute('class'),role:p.getAttribute('role'),html:i===3?p.outerHTML.slice(0,9000):undefined});return a;})(),html:(x.closest('.tuipro-secondary-toolbar-item')||x.parentElement)?.outerHTML.slice(0,3000)})),iconEvidence,navigationEvidence:nav.slice(0,20).map(x=>({label:text(x),html:x.parentElement?.parentElement?.outerHTML.slice(0,6000)})),buttons:n('button,[role="button"],a').map(x=>({label:text(x).slice(0,100),title:x.getAttribute('title'),ariaLabel:x.getAttribute('aria-label'),disabled:!!x.disabled})).filter(x=>x.label||x.title||x.ariaLabel).slice(0,130),images:n('img').slice(0,40).map(x=>({alt:x.alt,title:x.getAttribute('title'),classes:x.getAttribute('class'),bounds:rect(x)})),labels:n('[title],[aria-label]').slice(0,100).map(x=>({label:text(x).slice(0,100),title:x.getAttribute('title'),ariaLabel:x.getAttribute('aria-label'),classes:x.getAttribute('class')})),frames:n('iframe').map(x=>({title:x.title,src:(()=>{try{const u=new URL(x.src,location.href);return u.origin+u.pathname}catch{return null}})()}))};
    }
    if(options.expectedCompanyName!==undefined&&(!options.expectedCompanyName?.trim()||options.expectedCompanyName.length>200))throw Error('Invalid expected company display name');
    const nodes=candidateNodes();
    result.avatarCandidates=nodes.map(n=>({avatarKey:key(n),accountAvatar:accountAvatar(n),tag:n.tagName,id:n.id||null,classes:n.getAttribute('class')||'',title:n.getAttribute('title'),ariaLabel:n.getAttribute('aria-label'),alt:n.getAttribute('alt'),bounds:rect(n)})).slice(0,30);
    if(options.action==='inspect')return{...result,status:'identity-inspected',candidateCount:nodes.length};
    if(!options.avatarKey)throw Error('Inspect first and select the observed avatarKey');
    const matches=nodes.filter(n=>key(n)===options.avatarKey);
    if(matches.length!==1)throw Error('Observed avatar no longer uniquely identifies a header element; inspect again');
    const avatar=matches[0];
    const titles=()=>{
      const values=[];let n=avatar;
      for(let i=0;n&&n!==document.body&&i<3;i++,n=n.parentElement){
        if(!isHeader(n))break;
        const value=n.getAttribute('title');if(usable(value))values.push({source:'avatar-title',text:clean(value),bounds:rect(n)});
      }
      return values;
    };
    const tooltipNodes=()=>[...document.querySelectorAll('[role="tooltip"],[class*="tooltip"],[class*="Tooltip"]')].filter(visible);
    const before=new Set(tooltipNodes());
    const originalUrl=location.href;
    try{
      // Mouse events reveal the same UI account label described by the user; no clicks or navigation.
      for(const type of ['pointerover','mouseover','mouseenter'])avatar.dispatchEvent(new MouseEvent(type,{bubbles:type!=='mouseenter',cancelable:true,view:window}));
      await new Promise(resolve=>setTimeout(resolve,800));
      if(location.href!==originalUrl||!avatar.isConnected||!isHeader(avatar))throw Error('Design page or avatar changed during hover');
      result.evidence=titles();
      const described=new Set();let owner=avatar;
      for(let i=0;owner&&i<3;i++,owner=owner.parentElement)for(const id of (owner.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean))described.add(id);
      const a=avatar.getBoundingClientRect();
      const accountIds=[];
      // Observed on the real design toolbar: the account name is in a custom menu, not a tooltip.
      for(const n of [...document.querySelectorAll('[class*="TopBar-account-name_"]')].filter(visible)){
        const t=text(n),r=n.getBoundingClientRect();
        const nearby=r.x+r.width>=a.x-200&&r.x<=a.x+a.width+160&&r.y>=0&&r.y<=a.y+a.height+180;
        if(usable(t)&&nearby){
          result.evidence.push({source:'avatar-account-menu',text:t,selector:'[class*="TopBar-account-name_"]',bounds:rect(n)});
          const root=n.parentElement?.parentElement;
          for(const idNode of [...(root?.querySelectorAll('[class*="TopBar-account-id_"]')||[])].filter(visible)){
            const raw=text(idNode),match=/^ID\s*[:：]\s*([A-Za-z0-9_-]{1,100})$/i.exec(raw),ir=idNode.getBoundingClientRect();
            if(match&&Math.abs(ir.x-r.x)<=50&&ir.y>=r.y&&ir.y<=r.y+r.height+60)accountIds.push({id:match[1],source:'avatar-account-menu-id',text:raw,selector:'[class*="TopBar-account-id_"]',bounds:rect(idNode)});
          }
        }
      }
      for(const n of tooltipNodes()){
        const t=text(n),r=n.getBoundingClientRect();
        const nearby=r.x+r.width>=a.x-160&&r.x<=a.x+a.width+160&&r.y>=0&&r.y<=a.y+a.height+180;
        if(usable(t)&&(described.has(n.id)||(!before.has(n)&&nearby)))result.evidence.push({source:described.has(n.id)?'avatar-describedby':'new-nearby-tooltip',text:t,bounds:rect(n)});
      }
      const names=[...new Set(result.evidence.map(e=>e.text))];result.displayNameCandidates=names;
      const expected=clean(options.expectedCompanyName);
      // Names are not searched in the rest of the page; only evidence attached to the chosen avatar counts.
      if(names.length===1){
        result.companyDisplayName=names[0];
        const ids=[...new Set(accountIds.map(e=>e.id))];
        if(ids.length===1){result.visibleAccountId=ids[0];result.accountIdEvidence=accountIds.find(e=>e.id===ids[0]);}
        if(options.expectedCompanyName===undefined)result.status='identity-read';
        else {result.displayNameMatch=names[0]===expected;result.status=result.displayNameMatch?'display-name-match':'display-name-mismatch';}
        globalThis.__drawingAccountDisplayProof={url:location.href,documentEpoch:globalThis.performance?.timeOrigin,checkedAt:Date.now(),companyDisplayName:result.companyDisplayName,visibleAccountId:result.visibleAccountId};
      }
      return result;
    }finally{
      for(const type of ['pointerout','mouseout','mouseleave'])if(avatar.isConnected)avatar.dispatchEvent(new MouseEvent(type,{bubbles:type!=='mouseleave',cancelable:true,view:window}));
    }
  }catch(error){return{...result,status:'identity-read-failed',error:error.message};}
};
// BEGIN GENERATED FRONTEND CONFIG SYNC
// Export only the currently exposed drawing canvas. No app internals, browser tabs or unrelated windows.
globalThis.__drawingCaptureFrontendView=async function(o){
 const result={status:'frontend-capture-blocked',captured:false,effectVerified:false,saved:false,published:false,documentVisibility:document.visibilityState,platformCapture:{runtimeReload:typeof globalThis.chrome?.runtime?.reload==='function',debugger:typeof globalThis.chrome?.debugger?.attach==='function',tabsCapture:typeof globalThis.chrome?.tabs?.captureVisibleTab==='function'}};
 try{
  const proof=globalThis.__drawingAccountDisplayProof;result.bindingDiagnostics={hasProof:!!proof,epochMatch:proof?.documentEpoch===performance.timeOrigin,nameMatch:proof?.companyDisplayName===o.expectedCompanyName?.trim(),titleMatch:document.title===o.expectedTitle};
  if(!proof||new URL(proof.url).origin!==location.origin||proof.documentEpoch!==performance.timeOrigin||proof.companyDisplayName!==o.expectedCompanyName?.trim()||document.title!==o.expectedTitle)throw Error('Confirm the displayed account and design document before capture: '+JSON.stringify(result.bindingDiagnostics));
  const visible=n=>{if(!n?.getClientRects().length)return false;const r=n.getBoundingClientRect();if(r.width<=0||r.height<=0||r.x+r.width<=0||r.y+r.height<=0||r.x>=innerWidth||r.y>=innerHeight)return false;for(let p=n;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;}return true;};
  const exposed=n=>{if(!visible(n))return false;const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return!!top&&(top===n||n.contains(top)||(top!==document.body&&top!==document.documentElement&&top.contains(n)));};
  if([...document.querySelectorAll('[role="dialog"],.tui-modal-content,.ant-modal-content')].some(visible))throw Error('Close the dialog before capturing a drawing');
  const candidates=[...document.querySelectorAll('canvas')].filter(exposed).filter(n=>n.closest('[id^="scene2d-"],[id^="scene-2d-"]')&&n.getBoundingClientRect().width>=200&&n.getBoundingClientRect().height>=150&&n.width>0&&n.height>0);
  if(candidates.length!==1)throw Error('One exposed drawing canvas is required');
  const source=candidates[0],r=source.getBoundingClientRect();
  if(o.captureTask==='inspect')return{...result,status:'frontend-capture-ready',documentEpoch:performance.timeOrigin,sceneId:source.closest('[id^="scene2d-"],[id^="scene-2d-"]').id,bounds:{x:r.x,y:r.y,width:Math.min(r.width,900),height:Math.min(r.height,720)},viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:globalThis.devicePixelRatio||1},accountEvidence:{companyDisplayName:proof.companyDisplayName,checkedAt:new Date(proof.checkedAt).toISOString(),stale:Date.now()-proof.checkedAt>30000,sameDocument:true,identityVerified:false}};
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
  return{...result,status:'frontend-view-captured',captured:true,title:document.title,readAt:new Date().toISOString(),sceneId:source.closest('[id^="scene2d-"],[id^="scene-2d-"]').id,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},imageWidth:output.width,imageHeight:output.height,imageDataUrl:image,pixelSummary:{opaquePixels:opaque,nonWhitePixels:ink,redPixels:red},accountEvidence:{companyDisplayName:proof.companyDisplayName,checkedAt:new Date(proof.checkedAt).toISOString(),stale:Date.now()-proof.checkedAt>30000,sameDocument:true,identityVerified:false}};
 }catch(error){return{...result,error:error.message};}
};

// Fixed configuration refresh in the customer's drawing workspace. Never switches templates or publishes.
globalThis.__drawingSyncFrontendConfig=async function(o){
 const result={status:'frontend-sync-blocked',configurationUpdated:false,effectVerified:false,saved:false,published:false,executed:false};
 const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' '),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
 const exposed=n=>{if(!visible(n))return false;const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return!!top&&(top===n||n.contains(top)||(top!==document.body&&top!==document.documentElement&&top.contains(n)));};
 const nodes=(s,root=document)=>[...root.querySelectorAll(s)].filter(visible);
 const dialogs=()=>{const a=nodes('[role="dialog"],.tui-modal-content,.ant-modal-content');return a.filter(n=>!a.some(x=>x!==n&&n.contains(x)));};
 const templateDialog=()=>dialogs().filter(n=>text(n).startsWith('切换施工图模板')&&text(n).includes('当前使用的是「'));
 const click=n=>{const r=n.getBoundingClientRect();for(const type of ['mousedown','mouseup'])n.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:r.x+r.width/2,clientY:r.y+r.height/2,view:window}));n.click();};
 const brief=()=>dialogs().map(n=>({text:text(n).slice(0,4000),buttons:nodes('button',n).map(text),checkboxes:nodes('input[type="checkbox"],[role="checkbox"]',n).map(x=>({checked:typeof x.checked==='boolean'?x.checked:x.getAttribute('aria-checked'),label:text(x.closest('label')||x.parentElement),html:x.parentElement?.outerHTML?.slice(0,2500)}))}));
 const isSuccess=t=>/^(?:配置更新成功|更新配置成功|更新成功|配置已更新|配置更新完成|成功应用最新配置)[！!。]?$/.test(t);
 const records=globalThis.__drawingFrontendSyncRecords||(globalThis.__drawingFrontendSyncRecords=new Map());
 let record;
 try{
  if(!['inspect','update','confirm','verify'].includes(o.syncTask)||!/^[A-Za-z0-9_-]{8,100}$/.test(o.requestId||''))throw Error('Unsupported frontend refresh task');
  const proof=globalThis.__drawingAccountDisplayProof;
  if(!proof||proof.url!==location.href||proof.documentEpoch!==performance.timeOrigin||proof.companyDisplayName!==o.expectedCompanyName?.trim()||document.title!==o.expectedTitle)throw Error('The account display, document and design must be confirmed first');
  result.accountEvidence={companyDisplayName:proof.companyDisplayName,checkedAt:new Date(proof.checkedAt).toISOString(),stale:Date.now()-proof.checkedAt>30000,sameDocument:true,identityVerified:false};
  const binding=JSON.stringify([location.href,performance.timeOrigin,o.expectedBrowser,o.expectedCompanyName,o.expectedTitle,o.expectedTemplateName]);
  record=records.get(o.requestId);if(record&&record.binding!==binding)throw Error('Refresh request target changed');
  if(o.syncTask==='inspect'){
   if(record?.attempted)return{...result,...record.result,executed:false,phase:record.phase,dialogs:brief()};
   let ds=templateDialog();
   if(!ds.length){
    if(record?.templateOpenAttempted)return{...result,status:'frontend-sync-unconfirmed',phase:record.phase,dialogs:brief()};
    if(dialogs().length)throw Error('Close the unrelated dialog before inspecting the current template');
    const nav=await globalThis.__drawingReadFrontendIdentity({...o,syncTask:undefined,navigationTask:'open-settings',action:'hover',drawingTask:'inspect'});
    if(nav.navigationOutcome!=='observed')throw Error(nav.error||'Settings menu was not observed');
    const candidates=nodes('div,span,a,button').filter(exposed).filter(n=>text(n)==='切换施工图模板'),leaves=candidates.filter(n=>!candidates.some(x=>x!==n&&n.contains(x)));
    if(leaves.length!==1)throw Error('Unique observed template-view entry required');
    record={binding,phase:'template-dialog-open-attempted',templateOpenAttempted:true,attempted:false};records.set(o.requestId,record);click(leaves[0].closest('.tuipro-selectmenu-icon-item-wrapper-incontext')||leaves[0]);
    for(let i=0;i<30&&!ds.length;i++){await wait(100);ds=templateDialog();}
    if(!ds.length)return{...result,status:'frontend-sync-unconfirmed',phase:record.phase,dialogs:brief()};
   }
   if(ds.length!==1)throw Error('Current template dialog is ambiguous');
   const raw=text(ds[0]),name=/当前使用的是「([^」]+)」/.exec(raw)?.[1],enterprise=raw.split('企业模板')[1]?.split('行业模板')[0];
   if(name!==o.expectedTemplateName||!enterprise?.includes(name+' 当前'))throw Error('Current target enterprise template was not observed');
   const updatedAt=/更新于\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/.exec(enterprise)?.[1]||null;
   record={binding,phase:'inspected',checkedAt:Date.now(),template:{name,type:'enterprise',updatedAt},attempted:false};records.set(o.requestId,record);
   return{...result,status:'frontend-sync-inspected',template:record.template,dialogs:brief()};
  }
  if(!record)throw Error('Inspect the target enterprise template before refreshing configuration');
  const outcome=()=>{if(record.attempted&&!record.notice){const fresh=record.notices?.find(isSuccess);if(fresh){record.notice=fresh;record.phase='update-observed';}}return({...result,status:record.notice?'frontend-config-update-observed':'frontend-sync-unconfirmed',configurationUpdated:!!record.notice,phase:record.phase,template:record.template,updateNotice:record.notice||null,noticeCandidates:record.notices||[],dialogs:brief()});};
  if(o.syncTask==='verify')return outcome();
  if(o.syncTask==='update'){
   if(record.attempted)return{...outcome(),executed:false,submissionRepeated:false};
   if(!Number.isFinite(proof.checkedAt)||proof.checkedAt>Date.now()||Date.now()-proof.checkedAt>120000)throw Error('Refresh the displayed account before a new configuration update; historical identity is insufficient');
   if(Date.now()-record.checkedAt>120000)throw Error('Template inspection expired; inspect it again before the first update');
   const ds=templateDialog();if(ds.length){if(ds.length!==1)throw Error('Template dialog is ambiguous');const cancel=nodes('button',ds[0]).filter(n=>text(n)==='取消'&&!n.disabled);if(cancel.length!==1)throw Error('Unique template cancel button required');click(cancel[0]);await wait(350);if(templateDialog().length)throw Error('Template dialog did not close; refresh was not submitted');}
   if(dialogs().length)throw Error('Close the unrelated dialog before refreshing configuration');
   const nav=await globalThis.__drawingReadFrontendIdentity({...o,syncTask:undefined,navigationTask:'open-settings',action:'hover',drawingTask:'inspect'});
   if(nav.navigationOutcome!=='observed')throw Error(nav.error||'Settings menu was not observed');
   const leaves=nodes('div,span,a,button,[role="menuitem"]').filter(exposed).filter(n=>/^更新配置(?:\s*有更新)?$/.test(text(n))),small=leaves.filter(n=>!leaves.some(x=>x!==n&&n.contains(x)));
   if(small.length!==1)throw Error('Unique configuration refresh menu item required');
   const target=small[0].closest('.tuipro-selectmenu-icon-item-wrapper-incontext')||small[0];
   record.attempted=true;record.phase='update-click-attempted';record.notices=[];
   const prior=new Set(nodes('div,span,p').map(text).filter(t=>t&&t.length<100));
   const observe=()=>{for(const n of nodes('div,span,p,[role="alert"]')){const t=text(n);if(t.length>100||prior.has(t)||!/更新|配置/.test(t))continue;if(!record.notices.includes(t))record.notices.push(t);if(isSuccess(t)){record.notice=t;record.phase='update-observed';}}};
   record.startWatching=()=>{const observer=new MutationObserver(observe);observer.observe(document.body,{childList:true,subtree:true,characterData:true});setTimeout(()=>observer.disconnect(),15000);};record.startWatching();click(target);result.executed=true;
   for(let i=0;i<35&&!record.notice;i++){await wait(100);observe();if(dialogs().length)break;}
   const dsAfter=dialogs();if(dsAfter.length===1&&text(dsAfter[0]).includes('更新配置')){record.phase='awaiting-confirmation';record.dialogText=text(dsAfter[0]);}
   record.result=outcome();return record.result;
  }
  if(record.phase!=='awaiting-confirmation'||record.confirmAttempted)throw Error('No fresh update confirmation is available; do not resubmit');
  const ds=dialogs();if(ds.length!==1||text(ds[0])!==record.dialogText||/覆盖.*手动|清空|删除/.test(record.dialogText))throw Error('Refresh confirmation is unknown or affects additional work');
  if(record.dialogText.includes('全部重新生成')){const options=nodes('input[type="checkbox"],[role="checkbox"]',ds[0]).filter(n=>text(n.closest('label')||n.parentElement)==='全部重新生成');if(options.length!==1||(typeof options[0].checked==='boolean'?options[0].checked:options[0].getAttribute('aria-checked')!=='false')!==false)throw Error('Refresh confirmation is unknown or affects additional work');result.fullRegenerationSelected=false;}
  const buttons=nodes('button',ds[0]).filter(n=>['更新','确定','开始更新'].includes(text(n))&&!n.disabled);if(buttons.length!==1)throw Error('Unique observed update confirmation required');
  record.confirmAttempted=true;record.phase='confirmation-click-attempted';record.startWatching?.();click(buttons[0]);result.executed=true;await wait(800);return outcome();
 }catch(e){return{...result,error:e.message,phase:record?.phase,dialogs:brief()};}
};

