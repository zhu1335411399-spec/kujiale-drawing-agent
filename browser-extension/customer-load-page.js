// Bundled isolated-world adapter, not remote code. Inspection never submits a load.
globalThis.__drawingCustomerLoadPage = async function(options) {
  // Backward-compatible transport for already-loaded extensions; public tool schemas remain separate.
  if(options.configurationTask)return globalThis.__drawingLineStyleRuntime(options);
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
        const key='drawingLoadAttemptV1',signature=JSON.stringify([customerName,candidates[0],options.expectedStatus,result.templateCandidates,globalThis.performance?.timeOrigin||0]);
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
// BEGIN GENERATED LINE-STYLE RUNTIME
// Generated by scripts/build-config-page-runtime.mjs; edit source adapters, not this section.
// Bound line-style page actions. Controlled input uses the authorized browser input session.
// One explicit action per invocation; never publish, activate, delete, or import.
globalThis.__drawingLineStyleAction = async function(options = {}) {
  const result = { adapterBuild: 'line-style-actions-2', executed: false, saved: false,
    persistedReadback: false, published: false, status: 'blocked' };
  const visible = node => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
  const text = node => (node?.innerText || node?.textContent || '').trim().replace(/\s+/g, ' ');
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const fill=async input=>{
    input.focus?.();input.select?.();
    if(typeof globalThis.__drawingTrustedFill==='function')return globalThis.__drawingTrustedFill(input,options.value,options.action,options.rowId);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,options.value);
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    return 'dom-events';
  };
  const allowedActions = ['inspect', 'create', 'rename', 'lineType', 'scale', 'widthMm', 'colorIndex', 'save', 'confirmSave'];
  try {
    if (!allowedActions.includes(options.action)) throw new Error('Unsupported action');
    if (!['https://www.kujiale.com', 'https://beta.kujiale.com', 'https://yun.kujiale.com', 'https://yun-beta.kujiale.com'].includes(location.origin) ||
        !/^\/pub\/saas\/workbench\/construction\/drawing_config\/config\/style\/?$/.test(location.pathname)) throw new Error('Not the line-style configuration page');
    if (typeof options.expectedConfigName !== 'string' || !options.expectedConfigName || (!options.workflowAuthorized && !options.expectedConfigName.startsWith('MCP样式引用')) || !options.expectedCustomerName) throw new Error('Explicit authorized configuration and customer required');
    const configCandidates = [...document.querySelectorAll('.ant-select-selection-item,.tui-select-selection-item,[class*="select-selection-item"]')].filter(visible);
    const selected = configCandidates.filter(node => (node.getAttribute('title') || text(node)) === options.expectedConfigName);
    const statusNode = document.querySelector('[class*="TopBarRightComponent-configDesc"]');
    const statusText = text(statusNode);
    // Exact customer token after the source marker, never a substring match.
    const sourceCustomer = /来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(statusText)?.[1]?.trim();
    if (selected.length !== 1 || sourceCustomer !== options.expectedCustomerName) throw new Error('Displayed target could not be verified');
    const initialUrl = location.href;
    const guard = () => {
      if (location.href !== initialUrl || !selected[0].isConnected || !statusNode?.isConnected ||
          (selected[0].getAttribute('title') || text(selected[0])) !== options.expectedConfigName || text(statusNode) !== statusText) throw new Error('Target changed');
    };
    const table = [...document.querySelectorAll('table')].filter(visible).find(node => [...node.querySelectorAll('th')].some(cell => text(cell) === '线样式名称'));
    if (!table) throw new Error('Line-style table not found');
    const root = table.closest('.ant-table') || table.parentElement;
    const headers = [...table.querySelectorAll('th')].map(text);
    const rows = () => [...root.querySelectorAll('tbody tr[data-row-key]')].filter(visible);
    const snapshot = row => {
      const cells = [...row.querySelectorAll('td')];
      const values = {};
      for (const [key, header] of Object.entries({ name: '线样式名称', lineType: '线型', color: '颜色', widthMm: '线宽(mm)', ...(options.workflowAuthorized ? { scale: '线型比例' } : {}) })) {
        const cell = cells[headers.indexOf(header)];
        values[key] = cell ? [...cell.querySelectorAll('input')].filter(visible).find(input => input.value)?.value || text(cell) : null;
      }
      return { id: row.getAttribute('data-row-key'), ...values };
    };
    result.before = rows().map(snapshot);
    result.scope = 'current-rendered-web-page';
    if (options.action === 'inspect') {
      result.buttons=[...document.querySelectorAll('button')].filter(visible).slice(0,30).map(n=>({label:text(n),disabled:!!n.disabled}));
      const dialogs=[...document.querySelectorAll('[role="dialog"],.ant-modal,[class*="Modal-modal"],[class*="Dialog-dialog"]')].filter(visible);
      result.dialogs=dialogs.filter(n=>!dialogs.some(other=>other!==n&&n.contains(other))).map(n=>({text:text(n).slice(0,1200),buttons:[...n.querySelectorAll('button')].filter(visible).map(b=>({label:text(b),disabled:!!b.disabled}))}));
      result.notices=[...document.querySelectorAll('[role="alert"],.ant-message-notice,.tui-message,.tui-message-notice')].filter(visible).map(text).slice(0,10);
      result.status = 'observed'; return result;
    }
    if (options.allowWrite !== true) throw new Error('Write execution is not enabled');
    const overlaySelector = options.action==='confirmSave'?'.ant-popover,.ant-select-dropdown':['lineType', 'widthMm'].includes(options.action) ? '.ant-modal,.ant-popover' : '.ant-modal,.ant-popover,.ant-select-dropdown';
    if (options.workflowAuthorized) {
      // Ant Select's closing transition can outlive the field readback.
      for (let attempt = 0; attempt < 10 && [...document.querySelectorAll('.ant-select-dropdown')].some(visible); attempt++) await wait(100);
    }
    if ([...document.querySelectorAll(overlaySelector)].some(visible)) throw new Error('Close existing overlays before writing');
    const button = label => {
      const found = [...document.querySelectorAll('button')].filter(node => visible(node) && text(node).replace(/\s/g,'') === label.replace(/\s/g,'') && !node.disabled);
      if (found.length !== 1) throw new Error('Missing or ambiguous button: ' + label);
      return found[0];
    };
    guard();
    if (options.action === 'create') {
      const existingIds = new Set(result.before.map(row => row.id));
      const createButton = button('新建样式');
      createButton.click(); result.executed = true;
      for (let attempt = 0; attempt < 10; attempt++) {
        await wait(100); guard();
        let added = rows().filter(row => !existingIds.has(row.getAttribute('data-row-key')));
        if (added.length > 1 && options.workflowAuthorized) {
          const oldNames = new Set(result.before.map(r => r.name));
          added = added.filter(row => !oldNames.has(snapshot(row).name));
        }
        if (added.length === 1) { result.createdRow = snapshot(added[0]); break; }
        if (added.length > 1) throw new Error('Multiple rows appeared; stop without retrying');
      }
      result.status = result.createdRow ? 'created-ui-only' : 'creation-outcome-unknown';
      result.visibleDialogs = [...document.querySelectorAll('[role="dialog"],.ant-modal')].filter(visible).map(node => ({ title: text(node.querySelector('.ant-modal-title')), inputCount: node.querySelectorAll('input').length }));
      return result;
    }
    if (options.action === 'save' || options.action === 'confirmSave') {
      // A click is never promoted to saved:true or persistedReadback:true.
      if (!options.expectedRows || JSON.stringify(result.before) !== JSON.stringify(options.expectedRows)) throw new Error('Rows changed before save');
      const noticeSelector = '[role="alert"],.ant-message-notice,.tui-message,.tui-message-notice';
      const priorNotices = new Set([...document.querySelectorAll(noticeSelector)].filter(visible));
      const confirmation=()=>{
        const dialogs=[...document.querySelectorAll('[role="dialog"],.ant-modal')].filter(visible);
        const smallest=dialogs.filter(n=>!dialogs.some(other=>other!==n&&n.contains(other)));
        const prefix=('确认将基础配置'+options.expectedConfigName+'保存在'+options.expectedCustomerName).replace(/\s/g,'');
        return smallest.length===1&&[prefix+'?',prefix+'？'].some(s=>text(smallest[0]).replace(/\s/g,'').startsWith(s))?smallest[0]:null;
      };
      let successNotice = null;
      const examine = records => {
        for (const notice of [...document.querySelectorAll(noticeSelector)].filter(visible)) {
          const changed = records.some(record => notice.contains(record.target) || [...record.addedNodes || []].some(node => node === notice || node.contains?.(notice)));
          if ((!priorNotices.has(notice) || changed) && /保存成功|保存完成|已保存/.test(text(notice)) && !/失败|未保存|尚未保存/.test(text(notice))) successNotice = text(notice).slice(0, 180);
        }
        const currentStatus=text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
        const oldTime=/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.exec(statusText)?.[0],newTime=/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.exec(currentStatus)?.[0];
        const customer=/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(currentStatus)?.[1]?.trim();
        if(oldTime&&newTime&&newTime>oldTime&&customer===options.expectedCustomerName){successNotice='配置保存时间已更新: '+newTime;result.saveStatusBefore=statusText;result.saveStatusAfter=currentStatus;}
      };
      const observer = typeof MutationObserver === 'function' ? new MutationObserver(examine) : null;
      observer?.observe(document.body, { subtree: true, childList: true, characterData: true });
      try {
        let submit;
        if(options.action==='confirmSave'){
          const dialog=confirmation();if(!dialog)throw Error('Bound save confirmation dialog was not observed');
          const choices=[...dialog.querySelectorAll('button')].filter(n=>visible(n)&&!n.disabled&&text(n).replace(/\s/g,'')==='保存');
          if(choices.length!==1)throw Error('Confirmation save button is ambiguous');submit=choices[0];
        }else submit=button('保存');
        submit.click(); result.executed = true; result.status = 'save-requested-unverified';
        if (observer) for (let attempt = 0; attempt < 120 && !successNotice; attempt++) {
          await wait(100);examine([]);
          if(options.action==='save'&&confirmation()){result.saveConfirmationPending=true;break;}
        }
      } finally { observer?.disconnect(); }
      result.saveAcknowledged = Boolean(successNotice);
      result.saveNotice = successNotice;
      // UI acknowledgement alone is never promoted to persistence success.
      return result;
    }
    const matchingRows = rows().filter(row => row.getAttribute('data-row-key') === options.rowId);
    if (matchingRows.length !== 1) throw new Error('Target row is missing or ambiguous');
    const row = matchingRows[0];
    const before = snapshot(row);
    const creation = options.creationEvidence;
    const age = Date.now() - Date.parse(creation?.createdAt);
    const justCreated = (options.action === 'rename' || options.workflowAuthorized) && creation?.rowId === before.id && creation?.name === before.name &&
      creation?.configName === options.expectedConfigName && Number.isFinite(age) && age >= 0 && age <= 300000;
    if (!before.name?.startsWith('MCP_TEST_') && !justCreated && options.existingEditAuthorized !== true) throw new Error('Only test styles or an explicitly bound existing row can be edited');
    if (!options.expectedOriginal || ['name', 'lineType', 'color', 'widthMm', ...(options.workflowAuthorized ? ['scale'] : [])].some(key => before[key] !== options.expectedOriginal[key])) throw new Error('Original values changed');
    if (typeof options.value !== 'string' || !options.value.trim()) throw new Error('Explicit value required');
    const header = { rename: '线样式名称', scale: '线型比例', lineType: '线型', widthMm: '线宽(mm)', colorIndex: '颜色' }[options.action];
    const cell = [...row.querySelectorAll('td')][headers.indexOf(header)];
    if (!cell) throw new Error('Expected column is missing');
    if (options.action === 'rename' || options.action === 'scale') {
      if(options.action==='scale'&&before.lineType==='CONTINUOUS')throw Error('CONTINUOUS scale is not editable');
      if (options.action === 'rename' && ((!options.workflowAuthorized && !options.value.startsWith('MCP_TEST_')) || options.value.length > 100)) throw new Error('Invalid style name');
      if (options.action === 'scale' && (!Number.isFinite(Number(options.value)) || Number(options.value) <= 0)) throw new Error('Invalid scale');
      if (rows().some(other => other !== row && snapshot(other).name === options.value)) throw new Error('Duplicate test name on current page');
      let inputs = [...cell.querySelectorAll('input')].filter(node => visible(node) && !node.disabled && !node.readOnly);
      if (!inputs.length && options.workflowAuthorized && options.action === 'rename') {
        guard();
        // Some versions render a label until the name cell is clicked.
        const label = [...cell.querySelectorAll('span,div')].filter(n => visible(n) && text(n) === before.name).at(-1);
        (label || cell).click();
        await wait(200); guard();
        inputs = [...cell.querySelectorAll('input')].filter(node => visible(node) && !node.disabled && !node.readOnly);
      }
      if (inputs.length !== 1) throw new Error('Editable name input not observed');
      guard();
      result.inputMethod=await fill(inputs[0]);
      result.executed = true;
      if(typeof KeyboardEvent==='function'){
        inputs[0].dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));
        inputs[0].dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));
      }
      inputs[0].blur();
    } else if (options.action === 'colorIndex') {
      if (!/^\d+$/.test(options.value)) throw new Error('Only an explicit color index is supported; RGB editing is not verified');
      const triggers = [...cell.querySelectorAll('[class*="ColorPickerPanel-colorBlock"],[class*="ColorPickerPanel-triangle_"]')].filter(visible);
      if (triggers.length !== 1) throw new Error('Current-color trigger is ambiguous');
      const selector = '[class*="ColorPickerPanel-colorPickerContainer"]';
      if ([...document.querySelectorAll(selector)].some(visible)) throw new Error('Close the existing color panel first');
      let panel;
      try {
        guard(); triggers[0].click();
        for (let attempt = 0; attempt < 10; attempt++) {
          await wait(100);
          const panels = [...document.querySelectorAll(selector)].filter(visible);
          if (panels.length > 1) throw new Error('Multiple color panels appeared');
          if (panels.length === 1) { panel = panels[0]; break; }
        }
        if (!panel) throw new Error('Color index panel did not open');
        const inputs = [...panel.querySelectorAll('input[class*="ColorIndexPicker-input"]')].filter(node => visible(node) && !node.disabled && !node.readOnly);
        if (inputs.length !== 1) throw new Error('Editable color index input not observed');
        let input = inputs[0];
        for (const [attribute, compare] of [['min', (v, bound) => v >= bound], ['max', (v, bound) => v <= bound]]) {
          const bound = input.getAttribute(attribute) ?? input.getAttribute('aria-value' + attribute);
          if (bound !== null && bound !== '' && !compare(Number(options.value), Number(bound))) throw new Error('Color index exceeds the observed input range');
        }
        guard();
        input.focus?.();await wait(250);
        const liveInputs=[...panel.querySelectorAll('input[class*="ColorIndexPicker-input"]')].filter(n=>visible(n)&&!n.disabled&&!n.readOnly);
        if(liveInputs.length!==1)throw Error('Color input changed during focus');
        input=liveInputs[0];
        result.inputMethod=await fill(input);
        result.executed=true;await wait(150);
        const confirm = [...panel.querySelectorAll('button')].filter(n => visible(n) && !n.disabled && ['确定','确认','应用'].includes(text(n).replace(/\s/g,'')));
        if (confirm.length === 1) confirm[0].click();
        input.blur();
        await wait(150);
      } finally {
        document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
        for (let attempt = 0; attempt < 10 && panel && visible(panel); attempt++) await wait(100);
      }
      if (panel && visible(panel)) throw new Error('Color panel could not be closed');
    } else {
      // Require the exact desired option already rendered in an associated list.
      // Enumeration/opening is separate; never guess option indices or API values.
      const input = cell.querySelector('input[role="combobox"]');
      const listId = input?.getAttribute('aria-controls') || input?.getAttribute('aria-owns');
      if (options.workflowAuthorized && input?.getAttribute('aria-expanded') !== 'true') {
        const trigger = cell.querySelector('.ant-select-selector');
        if (!trigger) throw new Error('Dropdown trigger unavailable');
        trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
        await wait(200);
      }
      const popup = listId && document.getElementById(listId)?.closest('.ant-select-dropdown');
      const openMenus = [...document.querySelectorAll('.ant-select-dropdown')].filter(visible);
      if (openMenus.length !== 1 || openMenus[0] !== popup) throw new Error('Ambiguous dropdown ownership');
      const find = () => popup && visible(popup) ? [...popup.querySelectorAll('.ant-select-item-option')].filter(node => visible(node) &&
        text(node.querySelector('.ant-select-item-option-content') || node) === options.value && !node.classList.contains('ant-select-item-option-disabled')) : [];
      let candidates = find();
      if (options.workflowAuthorized && !candidates.length) {
        const holder = popup.querySelector('.rc-virtual-list-holder');
        if (holder) {
          holder.scrollTop = 0;
          for (let i = 0; i < 25 && !candidates.length; i++) {
            holder.dispatchEvent(new Event('scroll', { bubbles: true })); await wait(100); candidates = find();
            if (holder.scrollTop + holder.clientHeight >= holder.scrollHeight) break;
            holder.scrollTop += Math.max(24, holder.clientHeight * .75);
          }
        }
      }
      if (candidates.length !== 1) throw new Error('Exact associated option must be opened and uniquely observed before selection');
      guard(); candidates[0].click(); result.executed = true;
    }
    const changedKey = options.action === 'rename' ? 'name' : options.action === 'colorIndex' ? 'color' : options.action;
    for(let attempt=0;attempt<12;attempt++){
      await wait(100);guard();
      const fresh=rows().find(n=>n.getAttribute('data-row-key')===before.id);
      result.after=snapshot(fresh||row);
      if(result.after[changedKey]===options.value)break;
    }
    if (result.after[changedKey] !== options.value || ['name', 'lineType', 'color', 'widthMm', ...(options.workflowAuthorized && options.action !== 'lineType' ? ['scale'] : [])].some(key => key !== changedKey && before[key] !== result.after[key])) throw new Error('UI readback mismatch');
    result.status = 'edited-ui-only';
  } catch (error) { result.status = result.executed ? 'stopped-review-required' : 'blocked'; result.error = error.message; }
  return result;
}

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
