// Fixed annotation style business operations. No arbitrary scripts, endpoints, delete or publish.
globalThis.__drawingAnnotationRuntime=async function(options){
 const result={build:'annotation-runtime-1',status:'blocked',executed:false,saved:false,published:false};
 const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
 const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' ');
 const compact=n=>text(n).replace(/\s/g,'');
 const nodes=(s,r=document)=>[...r.querySelectorAll(s)].filter(visible);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const kind=options.annotationKind;
 const target={expectedConfigName:options.expectedConfigName,expectedCustomerName:options.expectedCustomerName};
 const inspect=a=>globalThis.__drawingStyleInspection({...target,section:'annotation',limit:50,...a});
 const status=()=>text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
 const source=s=>/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(s)?.[1]?.trim();
 const guard=()=>{if(!/^https:\/\/(?:www|beta|yun|yun-beta)\.kujiale\.com\/pub\/saas\/workbench\/construction\/drawing_config\/config\/style(?:[?#]|$)/.test(location.href)||source(status())!==target.expectedCustomerName||nodes('.ant-select-selection-item').filter(n=>(n.getAttribute('title')||text(n))===target.expectedConfigName).length!==1)throw Error('Displayed annotation configuration or customer changed');};
 const key=id=>'drawingAnnotationEditV1:'+id;
 const get=id=>JSON.parse(sessionStorage.getItem(key(id))||'null');
 const put=(id,r)=>sessionStorage.setItem(key(id),JSON.stringify(r));
 const canonical=rows=>JSON.stringify([...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(r=>[r.id,r.name]));
 const list=async(selectKind=kind)=>{
  guard();const r=await inspect({action:'inspect',...(selectKind?{annotationKind:selectKind}:{})});
  if(r.status!=='style-settings-observed')throw Error(r.error||'Close the existing style editor before this operation');
  const all=r.page.tables.flatMap(t=>t.rows).map(r=>({id:r.id,name:r.cells[1]}));
  const rows=[...new Map(all.map(r=>[r.id,r])).values()];
  const truncated=r.page.tables.some(t=>t.renderedRows>t.rows.length);
  const next=nodes('.ant-pagination-next').some(n=>n.getAttribute('aria-disabled')!=='true'&&!n.classList.contains('ant-pagination-disabled'));
  return{rows,complete:!truncated&&!next};
 };
 const search=async(query,selectKind=kind)=>{
  await list(selectKind);const inputs=nodes('input').filter(n=>n.getAttribute('placeholder')==='搜索样式名称'&&!n.disabled&&!n.readOnly);
  if(inputs.length!==1)throw Error('Unique annotation name search input was not observed');
  const input=inputs[0];input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,query);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  const buttons=input.closest('.ant-input-search')?nodes('button',input.closest('.ant-input-search')).filter(n=>!n.disabled):[];
  if(buttons.length===1)buttons[0].click();else{input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));input.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));}
  await wait(650);const read=await list(null);
  if(input.value!==query||query&&read.rows.some(r=>!r.name.includes(query)))throw Error('Annotation webpage search was not confirmed');
  return{...read,query,searchApplied:true,scope:'current-annotation-search-results'};
 };
 const uniqueButton=(label,root=document)=>{const found=nodes('button,a,[role="button"]',root).filter(n=>!n.disabled&&compact(n)===label);if(found.length!==1)throw Error('Missing or ambiguous button: '+label);return found[0];};
 const nameWizard=()=>{
  const label={text:'文本',leader:'引线',dimension:'尺寸',elevation:'标高'}[kind];
  const inputs=nodes('input').filter(n=>n.getAttribute('placeholder')==='请输入样式名称'&&!n.disabled&&!n.readOnly);if(inputs.length!==1)return null;
  let p=inputs[0].parentElement;for(let i=0;p&&p!==document.body&&i<10;i++,p=p.parentElement)if(text(p).includes('新建'+label+'样式')&&nodes('button,a,[role="button"]',p).some(n=>compact(n)==='下一步'))return{root:p,input:inputs[0]};return null;
 };
 const finishCreationWizard=async(record)=>{
  const wizard=nameWizard();if(!wizard)throw Error('Expected annotation name wizard is unavailable');
  if(typeof globalThis.__drawingTrustedFill!=='function'||globalThis.__drawingAnnotationInputVersion!==1)throw Error('Reload the Chrome extension to enable annotation wizard input');
  record.phase='create-name-input';put(options.requestId,record);await globalThis.__drawingTrustedFill(wizard.input,options.name,'annotationName',null);
  guard();record.phase='create-next-attempt-recorded';put(options.requestId,record);uniqueButton('下一步',wizard.root).click();await wait(400);
  const editor=await inspect({action:'inspect'});if(editor.status!=='editor-observed'||editor.dialogs.length!==1||editor.dialogs[0].editorType!==kind)throw Error('Annotation specification wizard did not match the requested category');
  record.phase='create-complete-attempt-recorded';record.defaultFields=editor.dialogs[0].fields;put(options.requestId,record);uniqueButton('完成').click();await wait(350);
 };
 const rowNode=id=>{const rows=nodes('tr[data-row-key]').filter(n=>n.getAttribute('data-row-key')===id);if(rows.length!==1)throw Error('Exact annotation row was not observed');return rows[0];};
 const rename=async(row,name)=>{
  if(row.name===name)return row;
  const node=rowNode(row.id),cell=[...node.querySelectorAll('td')][1];if(!cell)throw Error('Annotation name cell is missing');
  const label=nodes('span,div,a',cell).filter(n=>text(n)===row.name).at(-1);guard();(label||cell).click();await wait(200);
  let inputs=nodes('input',cell).filter(n=>!n.disabled&&!n.readOnly);
  if(inputs.length!==1){
   const action=nodes('button,a,[role="button"]',node).filter(n=>!n.disabled&&compact(n)==='重命名');
   if(action.length!==1)throw Error('Editable annotation name input was not observed');action[0].click();await wait(250);
   inputs=nodes('input',cell).filter(n=>!n.disabled&&!n.readOnly);
  }
  if(inputs.length!==1)throw Error('Rename opened a different editor; inspect before continuing');
  const input=inputs[0];input.focus();input.select?.();
  if(typeof globalThis.__drawingTrustedFill!=='function')throw Error('Reload the Chrome extension to enable the bound browser input channel');
  await globalThis.__drawingTrustedFill(input,name,'rename',row.id);
  input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));input.blur();await wait(250);
  const read=await search(name);const actual=read.rows.find(r=>r.id===row.id&&r.name===name);if(!read.complete||!actual)throw Error('Renamed annotation ID and name were not confirmed');return actual;
 };
 const fieldsForCompare=panel=>panel.fields.map(f=>({section:f.section,context:f.context,value:f.value,checked:f.checked,displayValue:f.displayValue,disabled:f.disabled}));
 const updateFont=async(row,value)=>{
  if(kind!=='text')throw Error('fontSize is only implemented for text styles');
  const opened=await inspect({action:'open-editor',annotationKind:kind,styleId:row.id});if(opened.status!=='editor-observed'||!opened.openedByInspector||opened.dialogs[0].editorType!=='text')throw Error('Bound text style editor was not observed');
  const before=opened.dialogs[0],input=nodes('input').filter(n=>n.getAttribute('role')==='spinbutton'&&!n.disabled&&!n.readOnly).find(n=>{let p=n.parentElement;for(let i=0;p&&i<5;i++,p=p.parentElement)if(text(p)==='字号')return true;return false;});
  if(!input)throw Error('Unique font size input was not observed');
  input.focus();if(typeof globalThis.__drawingTrustedFill!=='function')throw Error('Reload the Chrome extension to enable text font input');await globalThis.__drawingTrustedFill(input,value,'fontSize',row.id);await wait(150);guard();
  uniqueButton('完成').click();delete globalThis.__drawingStyleInspectionOwned;await wait(350);
  const fresh=await inspect({action:'open-editor',annotationKind:kind,styleId:row.id});if(fresh.status!=='editor-observed'||!fresh.openedByInspector)throw Error('Cannot reopen text style for field readback');
  const after=fresh.dialogs[0],actual=after.fields.find(f=>f.context==='字号')?.value;
  await inspect({action:'close-editor',styleId:row.id});
  if(actual!==value)throw Error('Font size readback did not match');
  const unchanged=p=>fieldsForCompare(p).filter(f=>f.context!=='字号');if(JSON.stringify(unchanged(before))!==JSON.stringify(unchanged(after)))throw Error('Other text style fields changed');
  return{fontSize:value};
 };
 try{
  if(typeof globalThis.__drawingStyleInspection!=='function')throw Error('Style inspection runtime is unavailable');
  if(options.annotationTask==='search'){
   const read=await search(options.query);return{...result,status:'annotation-search-read',annotationKind:kind,...read,styles:read.rows.filter(r=>!options.query||options.match!=='exact'||r.name===options.query)};
  }
  if(['create','update'].includes(options.annotationTask)){
   if(globalThis.__drawingAnnotationInputVersion!==1)throw Error('Reload the Chrome extension once to enable the annotation input channel');
   guard();if(text(document.body).includes('自动进入只读模式'))throw Error('Configuration is locked in read-only mode');
   const signature=JSON.stringify([target,kind,options.annotationTask,options.name||null,options.expectedStyle||null,options.changes||null]);
   const prior=get(options.requestId);if(prior?.signature&&prior.signature!==signature)throw Error('Annotation request ID belongs to different parameters');
   const resumeNameWizard=options.annotationTask==='create'&&prior&&['create-attempt-recorded','create-name-input'].includes(prior.phase)&&nameWizard()&&prior.kind===kind&&prior.target.expectedConfigName===target.expectedConfigName&&prior.target.expectedCustomerName===target.expectedCustomerName;
   if(prior&&!resumeNameWizard)return{...result,status:'request-already-used',receiptId:options.requestId,previousStatus:prior.phase,style:prior.style||null,error:'Read actual outcome before retrying; no repeated creation'};
   const baseline=resumeNameWizard?{rows:prior.beforeRows,complete:true}:await search('');if(!baseline.complete)throw Error('Complete annotation list is required before editing');
   const requestedName=options.name||options.changes?.name;
   if(requestedName&&baseline.rows.some(r=>r.name===requestedName&&r.id!==options.expectedStyle?.id))throw Error('Annotation name already exists in this category');
   let record=resumeNameWizard?{...prior,signature}:{target,url:location.href,kind,signature,phase:'preflight',beforeRows:baseline.rows,createdAt:new Date().toISOString()},row;
   if(options.annotationTask==='create'){
    if(!resumeNameWizard){record.phase='create-attempt-recorded';put(options.requestId,record);uniqueButton('新建样式').click();await wait(250);}result.executed=true;
    if(nameWizard())await finishCreationWizard(record);
    for(let i=0;i<15;i++){await wait(150);const read=await list(null);const added=read.rows.filter(r=>!baseline.rows.some(old=>old.id===r.id));if(added.length>1)throw Error('Multiple new rows appeared; do not repeat creation');if(added.length===1){row=added[0];break;}}
    if(!row)throw Error('Creation result is unknown; inspect before retrying');record={...record,phase:'created',style:row};put(options.requestId,record);
   }else{
    row=baseline.rows.find(r=>r.id===options.expectedStyle.id);if(!row||row.name!==options.expectedStyle.name)throw Error('Original annotation name or ID changed');
    record={...record,phase:'editing',original:row,style:row};put(options.requestId,record);
   }
   result.receiptId=options.requestId;result.style=row;
   if(requestedName&&requestedName!==row.name){record.phase='rename-attempt-recorded';put(options.requestId,record);result.executed=true;row=await rename(row,requestedName);record.style=row;put(options.requestId,record);}
   if(options.changes?.fontSize!==undefined){record.phase='font-edit-attempt-recorded';put(options.requestId,record);result.executed=true;record.expectedFields=await updateFont(row,options.changes.fontSize);}
   const all=await search('');if(!all.complete||canonical(all.rows.filter(r=>r.id!==row.id))!==canonical(baseline.rows.filter(r=>r.id!==row.id)))throw Error('Other annotation rows changed');
   const verified=await search(row.name);if(!verified.complete||!verified.rows.some(r=>r.id===row.id&&r.name===row.name))throw Error('Final annotation row readback failed');
   record={...record,phase:'edited',style:row,afterRows:all.rows};put(options.requestId,record);
   return{...result,status:'annotation-fields-verified',annotationKind:kind,receiptId:options.requestId,style:row,expectedFields:record.expectedFields||{},saved:false};
  }
  const receiptIds=options.receiptIds,records=receiptIds.map(get);if(records.some(r=>!r||r.url!==location.href||r.target.expectedConfigName!==target.expectedConfigName||r.target.expectedCustomerName!==target.expectedCustomerName||r.phase!=='edited'))throw Error('Verified annotation receipts for this configuration are required');
  const batchKey='drawingAnnotationSaveV1:'+receiptIds.join('|'),batch=JSON.parse(sessionStorage.getItem(batchKey)||'null');
  const expected=new Map();for(const r of records){const id=r.kind+':'+r.style.id;const previous=expected.get(id);if(previous&&r.original?.name!==previous.style.name)throw Error('Overlapping annotation receipts are not a continuous edit');expected.set(id,r);}
  const expectedStyles=[...expected.values()];
  const verifyRows=async()=>{
   for(const category of [...new Set(records.map(r=>r.kind))]){
    const initial=records.find(r=>r.kind===category),wanted=new Map(initial.beforeRows.map(r=>[r.id,r]));for(const r of records.filter(r=>r.kind===category))wanted.set(r.style.id,r.style);
    const read=await search('',category);if(!read.complete||canonical(read.rows)!==canonical([...wanted.values()]))throw Error('Annotation list changed before verification: '+category);
   }
  };
  if(options.annotationTask==='save'){
   if(batch)return globalThis.__drawingAnnotationRuntime({...options,annotationTask:'verify'});
   guard();await verifyRows();const beforeStatus=status();
   const state={phase:'save-open-attempt-recorded',beforeStatus,epoch:performance.timeOrigin,expectedStyles};sessionStorage.setItem(batchKey,JSON.stringify(state));
   uniqueButton('保存').click();result.executed=true;await wait(300);
   const dialogs=nodes('[role="dialog"],.ant-modal');const prefix=('确认将基础配置'+target.expectedConfigName+'保存在'+target.expectedCustomerName).replace(/\s/g,'');
   const matches=dialogs.filter(n=>[prefix+'?',prefix+'？'].some(p=>compact(n).startsWith(p)));const smallest=matches.filter(n=>!matches.some(other=>other!==n&&n.contains(other)));
   if(smallest.length!==1)throw Error('Exact customer save confirmation was not observed; no repeat save');
   state.phase='save-confirmation-attempt-recorded';sessionStorage.setItem(batchKey,JSON.stringify(state));uniqueButton('保存',smallest[0]).click();
   const time=s=>/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.exec(s)?.[0];let acknowledged=false;
   for(let i=0;i<120;i++){await wait(100);if(source(status())===target.expectedCustomerName&&time(status())>time(beforeStatus)){acknowledged=true;break;}}
   if(!acknowledged)throw Error('Fresh configuration save time was not observed; no repeated submission');
   await verifyRows();state.phase='reload-scheduled';state.saveStatus=status();sessionStorage.setItem(batchKey,JSON.stringify(state));setTimeout(()=>location.reload(),300);
   return{...result,status:'annotation-save-reload-scheduled',receiptIds,saved:false,saveStatus:state.saveStatus};
  }
  if(options.annotationTask!=='verify'||!batch||!['reload-scheduled','saved'].includes(batch.phase))throw Error('No acknowledged annotation save is available for verification');
  if(performance.timeOrigin===batch.epoch)return{...result,status:'awaiting-fresh-page'};
  if(/来自于\s*你的账号(?:\s|$)/.test(status()))return{...result,status:'customer-reload-required',currentStatus:status()};
  guard();await verifyRows();
  for(const r of expectedStyles.filter(r=>r.expectedFields?.fontSize)){
   await search(r.style.name,r.kind);const p=await inspect({action:'open-editor',annotationKind:r.kind,styleId:r.style.id});if(p.status!=='editor-observed'||!p.openedByInspector)throw Error('Saved text style editor unavailable');const actual=p.dialogs[0].fields.find(f=>f.context==='字号')?.value;await inspect({action:'close-editor',styleId:r.style.id});if(actual!==r.expectedFields.fontSize)throw Error('Saved font size did not persist');
  }
  batch.phase='saved';sessionStorage.setItem(batchKey,JSON.stringify(batch));
  return{...result,status:'annotation-save-verified',saved:true,persistedReadback:true,serverApiVerified:false,receiptIds,styles:expectedStyles.map(r=>({annotationKind:r.kind,...r.style,...r.expectedFields})),saveStatus:batch.saveStatus};
 }catch(error){const record=options.requestId?get(options.requestId):null;return{...result,status:result.executed?'needs-review':'blocked',error:error.message,...(record&&record.target.expectedConfigName===target.expectedConfigName&&record.target.expectedCustomerName===target.expectedCustomerName?{receiptId:options.requestId,phase:record.phase,style:record.style||result.style||null}:{})};}
};
