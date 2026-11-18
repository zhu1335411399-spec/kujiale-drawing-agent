// Bundled page runtime. Only fixed line-style operations; no arbitrary scripts or HTTP replay.
globalThis.__drawingLineStyleRuntime=async function(options){
  const result={build:'line-style-runtime-1',status:'blocked',saved:false,published:false,executed:false};
  const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
  const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' ');
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const bound={workflowAuthorized:true,expectedConfigName:options.expectedConfigName,expectedCustomerName:options.expectedCustomerName};
  const action=async args=>{
    const r=await globalThis.__drawingLineStyleAction({...bound,...args});
    if(r.executed)result.executed=true;
    if(!['observed','edited-ui-only','save-requested-unverified'].includes(r.status)){const e=Error(r.error||r.status);e.report=r;throw e;}
    return r;
  };
  const fields=['id','name','lineType','scale','color','widthMm'];
  const same=(a,b)=>!!a&&!!b&&fields.every(k=>(a[k]??'')===(b[k]??''));
  const canonical=rows=>JSON.stringify([...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(r=>fields.map(k=>r[k]??'')));
  const prepare=async()=>{
    try{const observed=await action({action:'inspect'});if(observed.dialogs?.length){Object.assign(result,{dialogs:observed.dialogs,notices:observed.notices});throw Error('An existing dialog requires review before searching or editing');}return observed;}
    catch(error){
      if(error.report?.error!=='Line-style table not found')throw error;
      if([...document.querySelectorAll('.ant-modal,[role="dialog"]')].some(visible))throw Error('Close the existing dialog before searching line styles');
      const tabs=[...document.querySelectorAll('[role="tab"]')].filter(n=>visible(n)&&text(n)==='线样式');
      if(tabs.length!==1||tabs[0].getAttribute('aria-selected')==='true')throw error;
      tabs[0].click();result.viewChanged=true;await wait(650);return action({action:'inspect'});
    }
  };
  const ledgerKey=id=>'drawingLineStyleEditV1:'+id;
  const store=value=>sessionStorage.setItem(ledgerKey(options.requestId||options.receiptId),JSON.stringify(value));
  const nextButton=()=>[...document.querySelectorAll('.ant-pagination-next')].filter(visible).filter(n=>n.getAttribute('aria-disabled')!=='true'&&!n.classList.contains('ant-pagination-disabled'));
  const settle=async()=>{
    let prior=null,stable=0;
    for(let i=0;i<35;i++){
      await wait(100);
      if([...document.querySelectorAll('.ant-spin-spinning')].some(visible))continue;
      const snapshot=await action({action:'inspect'}),stamp=canonical(snapshot.before);
      stable=stamp===prior?stable+1:0;prior=stamp;if(stable>=2)return snapshot.before;
    }
    throw Error('Line-style results did not settle');
  };
  const search=async(query,{maxPages=options.maxPages||10,match='exact',focusId=null}={})=>{
    await prepare();
    const inputs=[...document.querySelectorAll('input')].filter(n=>visible(n)&&!n.disabled&&!n.readOnly&&n.getAttribute('placeholder')==='搜索线样式名称');
    if(inputs.length!==1)throw Error('Unique webpage line-style search input was not observed');
    const input=inputs[0],previousQuery=input.value,container=input.closest('.ant-input-search');
    input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,query);
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    const buttons=container?[...container.querySelectorAll('button')].filter(n=>visible(n)&&!n.disabled):[];
    if(buttons.length===1)buttons[0].click();
    else {input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));input.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));}
    await wait(650);let rows=await settle();
    const currentPage=()=>text(document.querySelector('.ant-pagination-item-active'))||'1';
    if(currentPage()!=='1'){
      const first=[...document.querySelectorAll('.ant-pagination-item-1')].filter(visible);if(first.length!==1)throw Error('Search did not reset pagination; first page unavailable');first[0].click();rows=await settle();
    }
    const collected=new Map();let pages=0,complete=false,focusPage=null;
    for(let i=0;i<maxPages;i++){
      pages++;
      if(input.value!==query)throw Error('Search changed during read');
      if(query&&rows.some(r=>!r.name.includes(query)))throw Error('Webpage search results do not confirm the requested query');
      for(const row of rows){if(collected.has(row.id)&&!same(collected.get(row.id),row))throw Error('Result record changed during pagination');collected.set(row.id,row);}
      if(rows.some(r=>r.id===focusId))focusPage=currentPage();
      const next=nextButton();if(!next.length){complete=true;break;}if(next.length!==1)throw Error('Ambiguous pagination control');
      const before=currentPage();next[0].click();rows=await settle();if(currentPage()===before)throw Error('Next results page was not confirmed');
    }
    if(!focusId&&pages>1)focusPage='1';
    if(focusPage&&currentPage()!==focusPage){
      const first=[...document.querySelectorAll('.ant-pagination-item-1')].filter(visible);if(first.length!==1)throw Error('Cannot return to target result page');first[0].click();await settle();
      for(let i=1;i<Number(focusPage);i++){const next=nextButton();if(next.length!==1)throw Error('Target pagination changed');next[0].click();await settle();}
      if(currentPage()!==focusPage)throw Error('Target result page was not confirmed');
    }
    const all=[...collected.values()],styles=all.filter(r=>!query||(match==='exact'?r.name===query:r.name.includes(query)));
    return{query,previousQuery,styles,searchApplied:true,scope:'webpage-search-result-pages',pagesRead:pages,complete,matchingRows:styles.length,currentQuery:input.value,referenceUsage:'unknown',viewChanged:!!result.viewChanged};
  };
  try{
    if(!['search','update','save','verify'].includes(options.configurationTask))throw Error('Unsupported line-style operation');
    if(typeof globalThis.__drawingLineStyleAction!=='function')throw Error('Line-style action runtime missing');
    if(options.configurationTask==='search')return{...result,status:'search-results-read',...await search(options.query,{match:options.match||'contains'})};
    if(options.configurationTask==='update'){
      if(options.trustedInputRequired&&typeof globalThis.__drawingTrustedFill!=='function')throw Error('Reload the Chrome extension once to enable the browser input channel; no new edit was performed');
      const signature=JSON.stringify([location.href,bound,options.expectedStyle,options.changes]);
      const prior=JSON.parse(sessionStorage.getItem(ledgerKey(options.requestId))||'null');
      if(prior){
        if(prior.signature!==signature)throw Error('Request ID belongs to different edit parameters');
        return{...result,status:'request-already-used',receiptId:options.requestId,previousStatus:prior.phase,style:prior.style||null,error:'Read the recorded outcome before starting a new edit'};
      }
      if(text(document.body).includes('自动进入只读模式'))throw Error('The configuration is locked in read-only mode');
      const initial=await search('',{match:'contains'});if(!initial.complete)throw Error('All line-style pages must be inspected before editing');
      let row=initial.styles.find(r=>r.id===options.expectedStyle.id);
      if(!same(row,options.expectedStyle))throw Error('Original style fields changed; search and read again');
      const finalType=options.changes.lineType||row.lineType;
      if(options.changes.scale!==undefined&&finalType==='CONTINUOUS')throw Error('CONTINUOUS scale is not editable');
      if(options.changes.name!==undefined&&initial.styles.some(r=>r.id!==row.id&&r.name===options.changes.name))throw Error('The requested style name already exists');
      const located=await search(row.name,{focusId:row.id});if(!located.complete||!located.styles.some(r=>same(r,row)))throw Error('The exact style could not be located');
      // Find its actual results page, instead of editing another same-name record on the last page.
      if(!(await action({action:'inspect'})).before.some(r=>same(r,row)))throw Error('Target row is not on the current results page; narrow the search');
      let record={phase:'editing',signature,target:bound,url:location.href,beforeRows:initial.styles,original:row,mutated:false,createdAt:new Date().toISOString()};store(record);
      result.receiptId=options.requestId;result.style=row;
      for(const [operation,key,field] of [['lineType','lineType','lineType'],['scale','scale','scale'],['colorIndex','colorIndex','color'],['widthMm','widthMm','widthMm'],['rename','name','name']]){
        const value=options.changes[key];if(value===undefined||row[field]===value)continue;
        result.pendingField=key;
        let changed;
        try{changed=await action({action:operation,value,allowWrite:true,existingEditAuthorized:true,rowId:row.id,expectedOriginal:row});}
        catch(error){
          if(operation!=='rename'||!error.report?.executed)throw error;
          const relocated=await search(value,{focusId:row.id});const match=relocated.styles.filter(r=>r.id===row.id&&same(r,{...row,name:value}));
          if(!relocated.complete||match.length!==1)throw error;
          changed={after:match[0]};
        }
        result.executed=true;record.mutated=true;row=changed.after;record.style=row;result.style=row;store(record);
      }
      const readback=await search(row.name);const actual=readback.styles.filter(r=>r.id===row.id);
      if(!readback.complete||actual.length!==1||!same(actual[0],row))throw Error('Edited style could not be read back by its name and ID');
      const all=await search('',{match:'contains'});if(!all.complete)throw Error('Full list verification incomplete');
      if(canonical(all.styles.filter(r=>r.id!==row.id))!==canonical(initial.styles.filter(r=>r.id!==options.expectedStyle.id)))throw Error('Other line-style records changed; review required');
      await search(row.name);record={...record,phase:'edited',style:row,afterRows:all.styles};store(record);
      return{...result,status:record.mutated?'style-fields-verified':'unchanged',receiptId:options.requestId,style:row,saveRequired:record.mutated,referenceUsage:'unknown',searchQuery:row.name};
    }
    const record=JSON.parse(sessionStorage.getItem(ledgerKey(options.receiptId))||'null');
    if(!record||record.url!==location.href||record.target.expectedConfigName!==options.expectedConfigName||record.target.expectedCustomerName!==options.expectedCustomerName)throw Error('Edit receipt does not match this page and configuration');
    if(options.configurationTask==='save'&&['reload-scheduled','saved'].includes(record.phase))return globalThis.__drawingLineStyleRuntime({...options,configurationTask:'verify'});
    if(options.configurationTask==='save'){
      if(record.phase==='save-confirmation-attempt-recorded'){
        const beforeStatus=record.preSaveStatus;
        const currentStatus=text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
        const time=s=>/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.exec(s||'')?.[0];
        const source=s=>/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(s||'')?.[1]?.trim();
        if(!time(beforeStatus)||!time(currentStatus)||time(currentStatus)<=time(beforeStatus)||source(beforeStatus)!==options.expectedCustomerName||source(currentStatus)!==options.expectedCustomerName)throw Error('Submitted save has no fresh status evidence; do not repeat submission');
        const all=await search('',{match:'contains'});if(!all.complete||canonical(all.styles)!==canonical(record.afterRows))throw Error('Line styles changed after save submission; reload cancelled');
        const saveNotice='配置保存时间已更新: '+time(currentStatus);
        store({...record,phase:'reload-scheduled',saveNotice,preSaveStatus:beforeStatus,postSaveStatus:currentStatus,loadEpoch:performance.timeOrigin});
        setTimeout(()=>location.reload(),300);
        return{...result,status:'save-reload-scheduled',receiptId:options.receiptId,saveNotice,submissionRepeated:false};
      }
      const pendingConfirmation=['save-attempt-recorded','awaiting-save-confirmation'].includes(record.phase);
      if(record.phase!=='edited'&&!pendingConfirmation)throw Error('Save was already attempted or edit was not verified; do not retry');
      if(!record.mutated)return{...result,status:'unchanged',receiptId:options.receiptId,style:record.style};
      if(!pendingConfirmation){const all=await search('',{match:'contains'});if(!all.complete||canonical(all.styles)!==canonical(record.afterRows))throw Error('Line styles changed since the edit; save cancelled');}
      const before=await action({action:'inspect'});
      const currentStatus=text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
      record.preSaveStatus=record.preSaveStatus||currentStatus;
      let saved;
      if(pendingConfirmation){
        if(!before.dialogs?.length||!before.before.length||before.before.some(row=>!record.afterRows.some(expected=>same(row,expected))))throw Error('No matching pending save dialog and unchanged visible rows; do not retry save');
        store({...record,phase:'save-confirmation-attempt-recorded'});
        saved=await action({action:'confirmSave',allowWrite:true,expectedRows:before.before});
      }else{
        const saveButtons=before.buttons?.filter(b=>b.label.replace(/\s/g,'')==='保存'&&!b.disabled);
        if(saveButtons&&saveButtons.length!==1)return{...result,error:'Unique enabled save button is unavailable',availableButtons:before.buttons};
        store({...record,phase:'save-attempt-recorded'});
        try{saved=await action({action:'save',allowWrite:true,expectedRows:before.before});}
        catch(error){if(error.report?.executed===false)store({...record,phase:'edited',saveClickVerified:false});throw error;}
        if(saved.saveConfirmationPending){
          store({...record,phase:'awaiting-save-confirmation'});
          const confirmationView=await action({action:'inspect'});
          if(canonical(confirmationView.before)!==canonical(before.before))throw Error('Visible styles changed before save confirmation');
          store({...record,phase:'save-confirmation-attempt-recorded'});
          saved=await action({action:'confirmSave',allowWrite:true,expectedRows:confirmationView.before});
        }
      }
      if(!saved.executed||!saved.saveAcknowledged)throw Error('Fresh save acknowledgement was not observed; no reload or repeat save');
      if(canonical((await action({action:'inspect'})).before)!==canonical(before.before))throw Error('Visible styles changed after save; reload cancelled');
      store({...record,phase:'reload-scheduled',saveNotice:saved.saveNotice,loadEpoch:performance.timeOrigin});
      setTimeout(()=>location.reload(),300);
      return{...result,executed:true,status:'save-reload-scheduled',receiptId:options.receiptId,saveNotice:saved.saveNotice};
    }
    if(!['reload-scheduled','saved'].includes(record.phase))throw Error('No acknowledged save is pending verification');
    if(performance.timeOrigin===record.loadEpoch)return{...result,status:'awaiting-fresh-page'};
    const currentSource=text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
    if(/来自于\s*你的账号(?:\s|$)/.test(currentSource))return{...result,status:'customer-reload-required',currentStatus:currentSource};
    const fresh=await search(record.style.name);const matches=fresh.styles.filter(r=>r.id===record.style.id&&same(r,record.style));
    if(!fresh.complete||matches.length!==1)throw Error('Fresh-page style readback does not match the saved edit');
    store({...record,phase:'saved'});
    return{...result,status:'save-and-reload-readback-verified',saved:true,persistedReadback:true,serverApiVerified:false,receiptId:options.receiptId,style:matches[0],saveNotice:record.saveNotice,persistenceEvidence:'fresh save notice or updated save time, then page reload and bound customer readback; independent server API not verified'};
  }catch(error){return{...result,status:result.executed?'needs-review':'blocked',error:error.message,...(error.report?.after?{actualStyle:error.report.after}:{}),...(error.report?.colorPanelInspection?{colorPanelInspection:error.report.colorPanelInspection}:{})};}
};
