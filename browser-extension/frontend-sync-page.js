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
