// Bundled isolated-world adapter, not remote code. Inspection never submits a load.
globalThis.__drawingCustomerLoadPage = async function(options) {
  const result={build:'customer-load-4',loaded:false,submitted:false,identityVerified:false,saved:false,published:false,customerName:options.customerName};
  const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';
  const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' ');
  const label=n=>text(n).replace(/\s/g,'');
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const current=()=>text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
  const findDialog=()=>{
    const nodes=[...document.querySelectorAll('[role="dialog"],[class*="modal"],[class*="Modal"],[class*="dialog"],[class*="Dialog"]')].filter(n=>visible(n)&&text(n).includes('载入配置')&&text(n).includes('选择要载入的主账号'));
    const smallest=nodes.filter(n=>!nodes.some(x=>x!==n&&n.contains(x)));
    if(smallest.length>1)throw Error('Multiple customer-load dialogs');
    return smallest[0];
  };
  try {
    if(location.origin!=='https://www.kujiale.com'||!location.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/'))throw Error('Not a configuration page');
    if(!options.expectedStatus||current()!==options.expectedStatus)throw Error('Configuration changed; read context again');
    if(!['inspect','load'].includes(options.mode))throw Error('Invalid mode');
    const customerName=options.customerName?.trim();
    if(!customerName||customerName.length>200)throw Error('Customer display name required');
    if(options.customerLabel!==undefined&&(!options.customerLabel.trim()||options.customerLabel.length>400))throw Error('Invalid customer label');
    let dialog=findDialog();
    if(!dialog){
      const buttons=[...document.querySelectorAll('button,[role="button"]')].filter(n=>visible(n)&&!n.disabled&&label(n)==='载入');
      if(buttons.length!==1)throw Error('Load button missing or ambiguous');
      buttons[0].click();
      for(let i=0;i<15&&!dialog;i++){await wait(100);dialog=findDialog();}
    }
    if(!dialog)throw Error('Customer-load dialog was not identified');
    const template=()=>[...document.querySelectorAll('.ant-select')].filter(n=>visible(n)&&!dialog.contains(n)&&!n.closest('table,.ant-pagination,[class*="pagination"],[class*="Pagination"]')&&n.querySelector('[role="combobox"]')).map(n=>n.querySelector('.ant-select-selection-item')).filter(Boolean).map(n=>n.getAttribute('title')||text(n));
    const templateEvidence=()=>{const candidates=template();return{templateCandidates:candidates,selectedTemplate:candidates.length===1?candidates[0]:null};};
    const source=()=>/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(current())?.[1]?.trim();
    const accountName=s=>s.replace(/\s*你的账号\s*$/,'').replace(/\s*[(（][^()（）]*@[^()（）]*[)）]\s*$/,'').trim();
    const optionLabel=n=>text(n.querySelector('.ant-select-item-option-content')||n);
    const close=async()=>{
      const choices=[...dialog.querySelectorAll('button')].filter(n=>visible(n)&&!n.disabled&&n.getAttribute('aria-label')==='Close');
      if(choices.length!==1)throw Error('Dialog close button is ambiguous');
      choices[0].click();for(let i=0;i<15&&visible(dialog);i++)await wait(100);
      if(visible(dialog))throw Error('Dialog did not close');
    };
    Object.assign(result,templateEvidence());
    result.dialog={text:text(dialog).slice(0,4000),fields:[...dialog.querySelectorAll('input,select,[role="combobox"]')].filter(visible).map(n=>({tag:n.tagName,role:n.getAttribute('role'),readOnly:n.readOnly,id:n.id,classes:n.className,placeholder:n.getAttribute('placeholder')})),buttons:[...dialog.querySelectorAll('button,[role="button"]')].filter(visible).map(n=>({text:text(n),label:n.getAttribute('aria-label'),disabled:!!n.disabled}))};
    const pending=(options.drafts||[]).filter(d=>[...document.querySelectorAll('tr[data-row-key]')].some(r=>r.getAttribute('data-row-key')===d.id&&visible(r)));
    result.pendingDrafts=pending;
    const combos=[...dialog.querySelectorAll('[role="combobox"]')].filter(visible);
    if(combos.length===1){
      const combo=combos[0];
      const owner=combo.closest('.ant-select,.tui-select')||combo;
      if(combo.getAttribute('aria-expanded')!=='true'){
        const trigger=owner.querySelector('.ant-select-selector')||owner;
        trigger.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0}));await wait(250);
      }
      const popupFor=()=>{const owned=combo.getAttribute('aria-controls')||combo.getAttribute('aria-owns');const list=owned&&document.getElementById(owned);return list?.closest('.ant-select-dropdown,.tui-select-dropdown')||list;};
      let popup=popupFor();
      const choices=()=>popup?[...popup.querySelectorAll('.ant-select-item-option,.tui-select-option')].filter(n=>visible(n)&&n.getAttribute('aria-disabled')!=='true'&&!n.classList.contains('ant-select-item-option-disabled')):[];
      // Use the same search field as a person; never guess account IDs or call private endpoints.
      if(!combo.readOnly){
        combo.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(combo,customerName);
        combo.dispatchEvent(new Event('input',{bubbles:true}));combo.dispatchEvent(new Event('change',{bubbles:true}));await wait(600);popup=popupFor();
      }
      if(!popup)throw Error('Customer option list was not identified');
      const labels=new Set();
      const collect=()=>{for(const n of choices())labels.add(optionLabel(n));};
      const scroller=popup.querySelector('.rc-virtual-list-holder');
      if(scroller){
        scroller.scrollTop=0;scroller.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(100);
        let complete=false;
        for(let i=0;i<80;i++){
          collect();
          if(scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-2){complete=true;break;}
          const before=scroller.scrollTop;scroller.scrollTop+=Math.max(1,scroller.clientHeight-20);scroller.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(80);
          if(scroller.scrollTop===before)break;
        }
        if(!complete)throw Error('Customer option list could not be fully inspected; no load');
      }
      collect();result.visibleCustomers=[...labels].slice(0,100);
      const matchesLabel=s=>accountName(s)===customerName&&(!options.customerLabel||s===options.customerLabel.trim());
      const candidates=[...labels].filter(matchesLabel);
      result.matchingCustomers=candidates;
      if(options.mode==='load'){
        if(candidates.length!==1)return{...result,status:candidates.length?'ambiguous-customer':'customer-not-found',dialogLeftOpen:true};
        result.matchedCustomerLabel=candidates[0];
        // The page exposes a source name, not an account ID. Do not infer an exact-label identity from it.
        if(!options.customerLabel&&source()===customerName){
          await close();return{...result,status:'already-loaded',loaded:true,alreadyLoaded:true,sourceLabel:source(),...templateEvidence(),statusText:current()};
        }
        if(pending.length)return{...result,status:'unconfirmed-drafts',dialogLeftOpen:true};
        if(scroller){scroller.scrollTop=0;scroller.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(100);}
        let matches=choices().filter(n=>optionLabel(n)===candidates[0]);
        for(let i=0;scroller&&!matches.length&&i<80;i++){
          if(scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-2)break;
          scroller.scrollTop+=Math.max(1,scroller.clientHeight-20);scroller.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(80);matches=choices().filter(n=>optionLabel(n)===candidates[0]);
        }
        if(matches.length!==1)throw Error('Exact customer option not unique; no load');
        matches[0].click();await wait(250);
        const selected=owner.querySelector('.ant-select-selection-item,.tui-select-selection-item');
        if(text(selected)!==candidates[0])throw Error('Selected customer did not match complete label');
        if(current()!==options.expectedStatus)throw Error('Configuration changed before load');
        const confirm=[...dialog.querySelectorAll('button')].filter(n=>visible(n)&&!n.disabled&&label(n)==='载入');
        if(confirm.length!==1)throw Error('Load confirmation is disabled or ambiguous');
        const key='drawingLoadAttemptV1',signature=JSON.stringify([customerName,candidates[0],options.expectedStatus,result.templateCandidates]);
        if(sessionStorage.getItem(key)===signature)throw Error('Prior load attempt exists; inspect outcome instead of retrying');
        sessionStorage.setItem(key,signature);confirm[0].click();result.submitted=true;
        let stableKey=null,stableCount=0;
        for(let i=0;i<50;i++){
          await wait(200);
          if(source()===customerName&&!visible(dialog)){
            const evidence=templateEvidence(),nextKey=JSON.stringify([current(),evidence]);
            stableCount=nextKey===stableKey?stableCount+1:1;stableKey=nextKey;
            if(stableCount>=3)return{...result,status:'source-label-verified',loaded:true,sourceLabel:source(),...evidence,statusText:current()};
          } else {stableKey=null;stableCount=0;}
        }
        return{...result,status:'load-outcome-unverified',statusText:current()};
      }
    }
    return{...result,status:options.mode==='inspect'?'dialog-inspected':'inspection-failed',dialogLeftOpen:true};
  } catch(e) {return{...result,status:result.submitted?'load-outcome-unverified':'inspection-failed',error:e.message};}
};
