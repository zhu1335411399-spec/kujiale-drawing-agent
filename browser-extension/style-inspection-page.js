// Fixed read-only inspection of style settings. Never set values, create, save or publish.
globalThis.__drawingStyleInspection=async function(options){
  const result={build:'style-inspection-1',status:'blocked',saved:false,published:false,writesExecuted:false,viewChanged:false};
  const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
  const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' ');
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const nodes=(selector,root=document)=>[...root.querySelectorAll(selector)].filter(visible);
  const dialogs=()=>{
    const headings=nodes('h1,h2,h3,h4,div,span').filter(n=>/^(?:编辑|新建)(?:文本|引线|尺寸|标高)?样式$/.test(text(n)));
    const structural=[];
    for(const heading of headings){let p=heading.parentElement;for(let i=0;p&&p!==document.body&&i<10;i++,p=p.parentElement){const labels=nodes('button,[role="button"],a,div,span',p).map(n=>text(n).replace(/\s/g,''));if(labels.includes('取消')&&labels.some(v=>['完成','确定','创建','下一步'].includes(v))){structural.push(p);break;}}}
    const extra=nodes('[class*="modal"],[class*="Modal"],[class*="drawer"],[class*="Drawer"]').filter(n=>/编辑(?:文本|引线|尺寸|标高)样式/.test(text(n))&&nodes('button',n).some(b=>text(b).replace(/\s/g,'')==='取消'));
    const popovers=nodes('.ant-popover').filter(n=>n.querySelector('input')&&nodes('button',n).some(b=>['确定','确认','创建'].includes(text(b).replace(/\s/g,''))));
    const all=[...new Set([...nodes('[role="dialog"],.ant-modal,.ant-drawer-content'),...extra,...structural,...popovers])];return all.filter(n=>!all.some(other=>other!==n&&n.contains(other)));
  };
  const compact=n=>text(n).replace(/\s/g,'');
  const fieldContext=n=>{let p=n.parentElement;for(let i=0;p&&i<5;i++,p=p.parentElement){const t=text(p);if(t&&t.length<250)return t;}return null;};
  const fieldContextPath=n=>{const path=[];let p=n.parentElement;for(let i=0;p&&i<8;i++,p=p.parentElement){const value=text(p);if(value&&value.length<=420&&!path.includes(value))path.push(value);if(path.length===4)break;}return path;};
  const field=n=>({tag:n.tagName.toLowerCase(),type:n.getAttribute('type'),role:n.getAttribute('role'),id:n.id||null,classes:typeof n.className==='string'?n.className:null,
    label:n.getAttribute('aria-label')||text(n.closest('.ant-form-item,.tui-form-item')?.querySelector('label'))||null,
    context:fieldContext(n),contextPath:fieldContextPath(n),placeholder:n.getAttribute('placeholder'),value:n.value??n.getAttribute('aria-valuenow')??null,displayValue:text(n.closest('.ant-select')?.querySelector('.ant-select-selection-item'))||null,
    checked:n.matches('input[type="checkbox"],input[type="radio"]')?n.checked:n.getAttribute('aria-checked'),disabled:!!n.disabled,readOnly:!!n.readOnly,min:n.getAttribute('min'),max:n.getAttribute('max'),step:n.getAttribute('step'),title:n.getAttribute('title')});
  const snapshot=root=>{
    const tables=nodes('table',root),fields=nodes('input,select,textarea,[role="switch"]',root).filter(n=>!['password','hidden'].includes(n.getAttribute('type')));
    const editorLabel=/^(?:编辑|新建)(文本|引线|尺寸|标高)样式/.exec(text(root))?.[1]||null;
    const sectionLabels={文本:['文字外观','背景','边框','引线设置'],引线:['引线外观'],尺寸:['文字','尺寸线','尺寸界线','尺寸界限长度'],标高:['文字','标高符号','引线']}[editorLabel]||[];
    const sectionNodes=nodes('span,div,h1,h2,h3,h4,label',root).filter(n=>sectionLabels.includes(text(n)));
    const sectionFor=input=>{const preceding=sectionNodes.filter(n=>typeof n.compareDocumentPosition==='function'&&(n.compareDocumentPosition(input)&4));return preceding.length?text(preceding.at(-1)):null;};
    return{editorType:editorLabel?({文本:'text',引线:'leader',尺寸:'dimension',标高:'elevation'}[editorLabel]):null,categoryControls:nodes('label,span,div,button',root).filter(n=>['文本样式','引线样式','尺寸样式','标高样式'].includes(text(n))).filter(n=>!nodes('label,span,div,button',n).some(other=>text(other)===text(n))).map(n=>({label:text(n),tag:n.tagName,classes:n.className,role:n.getAttribute('role')})),tabs:nodes('[role="tab"],.ant-radio-button-wrapper,.ant-radio-wrapper',root).map(n=>({label:text(n),selected:n.getAttribute('aria-selected')||n.getAttribute('aria-checked')||n.querySelector('input')?.checked||null,classes:typeof n.className==='string'?n.className:null})),
      tables:tables.map(t=>({headers:[...t.querySelectorAll('th')].map(text),rows:nodes('tbody tr[data-row-key]',t).slice(0,options.limit||20).map(r=>({id:r.getAttribute('data-row-key'),cells:[...r.querySelectorAll('td')].map(text),actions:nodes('button,a,[role="button"]',r).map(n=>({label:text(n),title:n.getAttribute('title'),ariaLabel:n.getAttribute('aria-label')}))})),renderedRows:nodes('tbody tr[data-row-key]',t).length})),
      fields:fields.slice(0,100).map(n=>{const section=sectionFor(n);return{...field(n),section,sectionEvidence:section?'preceding-visible-section-label':null};}),fieldsTruncated:fields.length>100,
      buttons:nodes('button,a,[role="button"]',root).map(n=>({label:text(n),title:n.getAttribute('title'),ariaLabel:n.getAttribute('aria-label'),disabled:!!n.disabled})).filter(b=>b.label||b.title||b.ariaLabel).slice(0,80),
      titles:nodes('h1,h2,h3,h4,label,[class*="Title"],[class*="title"]',root).map(text).filter(t=>t&&t.length<180).slice(0,60),
      tips:nodes('[title]',root).map(n=>n.getAttribute('title')).filter(Boolean).slice(0,40),
      text:text(root).slice(0,14000),textTruncated:text(root).length>14000,scope:'current-visible-controls',complete:false};
  };
  try{
    if(!['https://www.kujiale.com','https://beta.kujiale.com','https://yun.kujiale.com','https://yun-beta.kujiale.com'].includes(location.origin)||!/^\/pub\/saas\/workbench\/construction\/drawing_config\/config\/style\/?$/.test(location.pathname))throw Error('Open the bound style configuration page first');
    if(!['annotation','general'].includes(options.section)||!['inspect','open-editor','close-editor'].includes(options.action))throw Error('Unsupported read-only style inspection');
    const initialUrl=location.href,status=()=>text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
    const initialStatus=status();
    const guard=()=>{
      const customer=/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(status())?.[1]?.trim();
      const selected=nodes('.ant-select-selection-item').filter(n=>(n.getAttribute('title')||text(n))===options.expectedConfigName);
      if(location.href!==initialUrl||status()!==initialStatus||customer!==options.expectedCustomerName||selected.length!==1)throw Error('Displayed configuration or customer could not be verified');
    };guard();
    if(options.action==='close-editor'){
      const owned=globalThis.__drawingStyleInspectionOwned,current=dialogs();
      if(current.length!==1||!owned||owned.url!==initialUrl||owned.status!==initialStatus||text(current[0]).slice(0,180)!==owned.dialogPrefix||(options.styleId&&owned.styleId!==options.styleId))throw Error('No matching inspection-owned editor to cancel');
      const raw=nodes('button,[role="button"],a,div,span',current[0]).filter(n=>!n.disabled&&(compact(n)==='取消'||n.getAttribute('aria-label')==='Close'));
      const choices=raw.filter(n=>!raw.some(other=>other!==n&&n.contains(other)));
      const cancel=choices.filter(n=>compact(n)==='取消'),close=choices.filter(n=>n.getAttribute('aria-label')==='Close');const button=cancel.length===1?cancel[0]:close.length===1?close[0]:null;
      if(!button)throw Error('An unambiguous cancel/close control was not observed');guard();button.click();await wait(300);
      if(dialogs().length)throw Error('Editor did not close');delete globalThis.__drawingStyleInspectionOwned;return{...result,status:'editor-closed',viewChanged:true};
    }
    if(dialogs().length)return{...result,status:'editor-observed',dialogs:dialogs().map(snapshot),openedByInspector:!!globalThis.__drawingStyleInspectionOwned};
    const sectionLabel=options.section==='annotation'?'注释样式':'通用设置';
    const tabs=nodes('[role="tab"]').filter(n=>text(n)===sectionLabel);
    if(tabs.length!==1)throw Error('Unique style section tab was not observed');
    if(tabs[0].getAttribute('aria-selected')!=='true'){guard();tabs[0].click();result.viewChanged=true;await wait(600);guard();}
    const kinds={text:['文本样式','文字样式'],leader:['引线样式'],dimension:['尺寸样式'],elevation:['标高样式']};
    if(options.annotationKind){
      if(options.section!=='annotation'||!kinds[options.annotationKind])throw Error('Invalid annotation style category');
      const candidates=nodes('[role="tab"],.ant-radio-button-wrapper,.ant-menu-item,[role="menuitem"],label').filter(n=>kinds[options.annotationKind].includes(text(n)));
      if(candidates.length!==1)return{...result,error:'Unique annotation category control was not observed',page:snapshot(document.body)};
      if(candidates[0].getAttribute('aria-selected')!=='true'&&!candidates[0].querySelector('input:checked')){guard();candidates[0].click();result.viewChanged=true;await wait(400);guard();}
    }
    if(options.action==='open-editor'){
      if(options.section!=='annotation'||!options.styleId)throw Error('An observed annotation style ID is required');
      const rows=nodes('tr[data-row-key]').filter(n=>n.getAttribute('data-row-key')===options.styleId);
      if(rows.length!==1)throw Error('Style row is missing or ambiguous');
      const buttons=nodes('button,a,[role="button"],span',rows[0]).filter(n=>['编辑','文字编辑','文本编辑'].includes(text(n)));
      const smallest=buttons.filter(n=>!buttons.some(other=>other!==n&&n.contains(other)));
      if(smallest.length!==1)return{...result,error:'Unique editor action was not observed',row:snapshot(rows[0])};
      guard();globalThis.__drawingStyleInspectionOwned={url:initialUrl,status:initialStatus,styleId:options.styleId,pending:true};smallest[0].click();result.viewChanged=true;await wait(500);guard();
      const opened=dialogs();if(opened.length!==1)throw Error('Editor dialog was not uniquely observed');
      globalThis.__drawingStyleInspectionOwned={url:initialUrl,status:initialStatus,styleId:options.styleId,dialogPrefix:text(opened[0]).slice(0,180)};
      return{...result,status:'editor-observed',styleId:options.styleId,openedByInspector:true,dialogs:opened.map(snapshot)};
    }
    const tabRoot=tabs[0].closest('.ant-tabs'),content=tabRoot?.querySelector('.ant-tabs-content-holder');
    const root=content&&visible(content)?content:tabRoot||document.body;
    return{...result,status:'style-settings-observed',section:options.section,annotationKind:options.annotationKind||null,page:snapshot(root)};
  }catch(error){return{...result,error:error.message};}
};
