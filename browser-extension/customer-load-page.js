// Bundled isolated-world adapter, not remote code. Inspection never submits a load.
globalThis.__drawingCustomerLoadPage = async function(options) {
  // Backward-compatible transport for already-loaded extensions; public tool schemas remain separate.
  if(options.styleDomain==='object')return globalThis.__drawingObjectConfig(options);
  if(options.styleDomain==='annotation')return globalThis.__drawingAnnotationRuntime(options);
  if(options.configurationTask==='inspect-style-settings')return globalThis.__drawingStyleInspection(options);
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

// Fixed object-configuration adapter. No arbitrary URL, selector, JavaScript or business endpoint.
globalThis.__drawingObjectConfig=async function(options){
 if(['read-properties','update-properties','replace-line','save','verify'].includes(options.action))return globalThis.__drawingObjectWrite(options);
 const result={build:'object-config-1',status:'blocked',executed:false,saved:false,published:false,url:location.origin+location.pathname};
 const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('.ant-drawer:not(.ant-drawer-open)');
 const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' ');
 const nodes=(s,r=document)=>[...r.querySelectorAll(s)].filter(visible);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const status=()=>text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
 const rowNodes=()=>nodes('tbody tr[data-row-key]').filter(n=>n.querySelector('td')&&!n.closest('.ant-drawer'));
 const selectNodes=()=>nodes('.ant-select').filter(n=>!n.closest('tbody,.ant-pagination'));
 const field=n=>({tag:n.tagName.toLowerCase(),type:n.getAttribute('type'),role:n.getAttribute('role'),value:n.value??null,checked:n.type==='checkbox'?n.checked:null,disabled:!!n.disabled||n.getAttribute('aria-disabled')==='true',label:n.getAttribute('aria-label'),placeholder:n.getAttribute('placeholder'),context:text(n.closest('td,label,.ant-form-item')||n.parentElement).slice(0,300)});
 const rows=()=>rowNodes().slice(0,150).map((n,i)=>({id:n.getAttribute('data-row-key'),index:i,level:n.className.match(/level-(\d+)/)?.[1]||null,cells:[...n.querySelectorAll(':scope > td')].map(text),columns:[...n.querySelectorAll(':scope > td')].map(c=>({text:text(c),classes:c.className,checks:nodes('input[type="checkbox"]',c).map(field),selects:nodes('.ant-select',c).map(s=>({value:text(s.querySelector('.ant-select-selection-item')),disabled:s.classList.contains('ant-select-disabled')})),inherited:!!c.querySelector('[class*="ObjectConfig-disabled"],.ant-select-disabled')})),fields:nodes('input,[role="checkbox"],[role="switch"]',n).map(field),selects:nodes('.ant-select',n).map(s=>({value:text(s.querySelector('.ant-select-selection-item')),disabled:s.classList.contains('ant-select-disabled')}))}));
 const snapshot=()=>({url:location.origin+location.pathname,configStatusText:status(),tabs:nodes('[role="tab"]').map(n=>({label:text(n),selected:n.getAttribute('aria-selected')})),selects:selectNodes().map((n,i)=>({key:'select-'+i,value:text(n.querySelector('.ant-select-selection-item')),title:n.querySelector('.ant-select-selection-item')?.getAttribute('title'),context:text(n.parentElement).slice(0,300),html:n.outerHTML.slice(0,1800)})),headers:nodes('thead th').map(text),rows:rows(),rowsTruncated:rowNodes().length>150,inputs:nodes('input:not([type="checkbox"])').filter(n=>!n.closest('tbody')&&!['password','hidden'].includes(n.type)).map(field),choices:nodes('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [role="option"],.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').map(n=>({label:text(n),title:n.getAttribute('title'),selected:n.getAttribute('aria-selected')})),panels:nodes('[role="dialog"],.ant-drawer-content,.ant-modal-content').map(n=>({text:text(n).slice(0,7000),fields:nodes('input,select,[role="checkbox"]',n).map(field),buttons:nodes('button',n).map(n=>({label:text(n),disabled:!!n.disabled}))})),text:text(document.body).slice(-16000),rowEvidence:rowNodes().filter((n,i)=>i<2||[...n.querySelectorAll(':scope > td')].some(c=>text(c)==='墙')).slice(0,4).map(n=>n.outerHTML.slice(0,14000))});
 try{
  if(!['https://www.kujiale.com','https://beta.kujiale.com','https://yun.kujiale.com','https://yun-beta.kujiale.com'].includes(location.origin)||!location.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/config/'))throw Error('Open a supported configuration page first');
  if(options.action==='open-object'){
   const source=/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(status())?.[1]?.trim();if(status()!==options.expectedStatus||source!==options.expectedCustomerName)throw Error('Source changed before object navigation');
   const links=nodes('a[href]').filter(n=>text(n)==='对象配置'&&new URL(n.href,location.href).pathname==='/pub/saas/workbench/construction/drawing_config/config/object');if(links.length!==1)throw Error('Unique observed object navigation required');if(!/\/config\/object\/?$/.test(location.pathname)){links[0].click();await wait(600);}
  }
  if(!/\/config\/object\/?$/.test(location.pathname))throw Error('Open the object configuration page first');
  const startUrl=location.href,startStatus=status();
  const guard=()=>{const customer=/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(status())?.[1]?.trim();if(location.href!==startUrl||status()!==startStatus||startStatus!==options.expectedStatus||customer!==options.expectedCustomerName)throw Error('Object target or source display changed');if(options.expectedConfigName&&!selectNodes().some(n=>(n.querySelector('.ant-select-selection-item')?.getAttribute('title')||text(n.querySelector('.ant-select-selection-item')))===options.expectedConfigName))throw Error('Selected configuration name does not match');};guard();
  const observedRow=()=>{const matches=rowNodes().filter(n=>n.getAttribute('data-row-key')===options.rowId&&text(n.querySelector('td'))===options.trueCategory);if(matches.length!==1)throw Error('Unique observed true category and row ID required');return matches[0];};
  if(nodes('.ant-drawer-content,.ant-modal-content').length&&!['inspect','close-picker','scan-style-candidates'].includes(options.action))throw Error('Inspect or close the existing replacement/editor panel before changing the view');
  if(options.action==='open-property-menu'||options.action==='open-section-options'||options.action==='expand-category'){
   const row=observedRow();if(options.action==='expand-category'){const b=row.querySelector('button.ant-table-row-expand-icon-collapsed');if(b){b.click();await wait(250);guard();}}
   else{const col={selectable:1,sectionMode:2,hideSideElevation:3}[options.property];if(!col)throw Error('Explicit property required');const cell=row.querySelectorAll(':scope > td')[col];if(options.action==='open-property-menu'){const menu=nodes('.ant-dropdown-trigger[aria-label="ellipsis"]',cell);if(menu.length!==1)throw Error('Observed inheritance menu required');menu[0].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));menu[0].dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));await wait(250);if(!nodes('.ant-dropdown-menu').length)menu[0].click();}
    else{const selector=cell.querySelector('.ant-select:not(.ant-select-disabled) .ant-select-selector');if(!selector)throw Error('Section mode is inherited or unavailable; inspect inheritance first');selector.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));}await wait(250);guard();}
   return{...result,status:'object-config-observed',page:snapshot(),menus:nodes('.ant-dropdown-menu').map(n=>({text:text(n),html:n.outerHTML.slice(0,7000)}))};
  }else if(options.action==='search-true-category'){
   if(typeof options.query!=='string'||options.query.length>100)throw Error('Explicit bounded true-category query required');const a=nodes('input[placeholder="搜索真分类"]');if(a.length!==1)throw Error('Unique observed true-category search input required');const input=a[0];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,options.query);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));input.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));const searchIcon=(input.closest('.ant-input-affix-wrapper,.ant-input-search')||input.parentElement).querySelector('[aria-label="search"],.ant-input-search-button');if(searchIcon)searchIcon.click();await wait(450);guard();if(input.value!==options.query)throw Error('Search query did not remain set');const p=snapshot();return{...result,status:'object-config-observed',query:options.query,matches:p.rows.filter(row=>row.cells[0]===options.query),page:p,searchEvidence:(input.closest('.ant-input-affix-wrapper,.ant-input-search')||input.parentElement).outerHTML.slice(0,5000)};
  }else if(options.action==='close-picker'){
   const owned=globalThis.__drawingObjectPickerOwned,ds=nodes('.ant-drawer-content');const explicitlyInspected=!owned&&options.expectedValue&&ds.length===1&&text(ds[0].querySelector('.ant-drawer-title'))===options.expectedValue&&options.expectedValue.startsWith(options.trueCategory+'-替换');if(!explicitlyInspected&&(!owned||owned.url!==location.href||owned.source!==status()||ds.length!==1||text(ds[0].querySelector('.ant-drawer-title'))!==owned.title))throw Error('No matching inspected picker to cancel');const cancel=nodes('button',ds[0]).filter(n=>text(n).replace(/\s/g,'')==='取消');if(cancel.length!==1)throw Error('Unique picker cancel required');cancel[0].click();await wait(250);delete globalThis.__drawingObjectPickerOwned;
  }else if(options.action==='scan-style-candidates'){
   const owned=globalThis.__drawingObjectPickerOwned,ds=nodes('.ant-drawer-content');if(!owned||owned.url!==location.href||owned.source!==status()||ds.length!==1||text(ds[0].querySelector('.ant-drawer-title'))!==owned.title)throw Error('Open an owned line-style picker first');const d=ds[0],seen=new Map();const first=d.querySelector('.ant-pagination-item-1');if(first){first.click();await wait(150);}if(d.querySelector('.ant-pagination-item-active')&&text(d.querySelector('.ant-pagination-item-active'))!=='1')throw Error('Picker must start at page 1');let complete=false;for(let i=0;i<40;i++){guard();for(const row of nodes('tbody tr[data-row-key]',d)){const c=[...row.querySelectorAll('td')].map(text);seen.set(row.getAttribute('data-row-key'),{id:row.getAttribute('data-row-key'),name:c[1],color:c[3],widthMm:c[4]});}const next=d.querySelector('.ant-pagination-next');if(!next||next.classList.contains('ant-pagination-disabled')){complete=true;break;}const before=text(d.querySelector('.ant-pagination-item-active'));(next.querySelector('button')||next).click();await wait(130);if(text(d.querySelector('.ant-pagination-item-active'))===before)throw Error('Picker page did not change');}return{...result,status:'object-config-observed',styleCandidates:[...seen.values()],complete,page:snapshot()};
  }else if(options.action==='open-style-picker'){
   const row=observedRow();const index={modelingLine:1,outlineLine:2,surfaceFill:3,sectionLine:5,sectionFill:6}[options.styleField];if(!index)throw Error('Explicit observed style column required');const cell=row.querySelectorAll(':scope > td')[index];const links=nodes('a,button,span,div',cell).filter(n=>text(n)==='替换');const smallest=links.filter(n=>!links.some(x=>x!==n&&n.contains(x)));if(smallest.length!==1)throw Error('Unique replace action not observed');smallest[0].click();await wait(350);guard();const d=nodes('.ant-drawer-content');if(d.length!==1)throw Error('Unique replacement drawer required');globalThis.__drawingObjectPickerOwned={url:location.href,source:status(),rowId:options.rowId,field:options.styleField,title:text(d[0].querySelector('.ant-drawer-title'))};return{...result,status:'object-config-observed',page:snapshot(),pickerEvidence:nodes('[class*="drawer"],[class*="Drawer"],.ant-drawer-content').filter(n=>text(n).includes('替换')).slice(-3).map(n=>n.outerHTML.slice(0,16000))};
  }else if(options.action==='scan-categories'){
   const dropdowns=nodes('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');if(dropdowns.length!==1)throw Error('One open major-category list required');const d=dropdowns[0],holder=d.querySelector('.rc-virtual-list-holder'),labels=new Set();let complete=false;for(let i=0;i<25;i++){for(const n of nodes('.ant-select-item-option',d))labels.add(n.getAttribute('title')||text(n));if(!holder||holder.scrollTop+holder.clientHeight>=holder.scrollHeight-2){complete=true;break;}const old=holder.scrollTop;holder.scrollTop+=Math.max(20,holder.clientHeight*.8);holder.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(90);guard();if(holder.scrollTop===old)break;}return{...result,status:'object-config-observed',majorCategories:[...labels],complete,page:snapshot()};
  }else if(options.action==='select-section'){
   const label={properties:'对象属性',display:'显示样式'}[options.section];const choices=nodes('[role="tab"]').filter(n=>text(n)===label);if(choices.length!==1)throw Error('Unique observed object section required');if(choices[0].getAttribute('aria-selected')!=='true'){choices[0].click();await wait(450);guard();}
  }else if(options.action==='open-category-list'){
   const match=/^select-(\d+)$/.exec(options.controlKey||'');const n=match&&Number(match[1])===1&&selectNodes()[1];if(!n||!options.expectedValue||text(n.querySelector('.ant-select-selection-item'))!==options.expectedValue)throw Error('Observed major-category selector changed; configuration selector is excluded');if(n.classList.contains('ant-select-disabled'))throw Error('Selector is disabled');n.querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(200);guard();
  }else if(options.action==='select-category'){
   const d=nodes('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'),listId=selectNodes()[1]?.querySelector('input[aria-controls]')?.getAttribute('aria-controls');if(d.length!==1||!listId||document.getElementById(listId)?.closest('.ant-select-dropdown')!==d[0])throw Error('Only the observed major-category dropdown can be selected');const choices=nodes('.ant-select-item-option',d[0]).filter(n=>(n.getAttribute('title')||text(n))===options.majorCategory);if(choices.length!==1)throw Error('Open and inspect a unique category option first');choices[0].click();await wait(450);guard();
  }else if(!['inspect','open-object'].includes(options.action))throw Error('Unsupported object inspection action');
  return{...result,status:'object-config-observed',page:snapshot()};
 }catch(error){return{...result,error:error.message};}
};

// Narrow object-property and line-reference writes with task receipts. Never publishes.
globalThis.__drawingObjectWrite=async function(o){
 const r={build:'object-write-1',status:'blocked',executed:false,saved:false,published:false};
 const visible=n=>!!n?.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('.ant-drawer:not(.ant-drawer-open)');
 const text=n=>(n?.innerText||n?.textContent||'').trim().replace(/\s+/g,' '),compact=n=>text(n).replace(/\s/g,'');
 const ns=(s,p=document)=>[...p.querySelectorAll(s)].filter(visible),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const source=()=>text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
 const customer=()=>/来自于\s*(.*?)\s+\d{4}-\d{2}-\d{2}/.exec(source())?.[1]?.trim();
 const key=id=>'drawingObjectEditV1:'+id,get=id=>JSON.parse(sessionStorage.getItem(key(id))||'null'),put=(id,v)=>sessionStorage.setItem(key(id),JSON.stringify(v));
 const target={expectedConfigName:o.expectedConfigName,expectedCustomerName:o.expectedCustomerName},epoch=performance.timeOrigin;
 let record;
 const configName=()=>ns('.ant-select').filter(n=>!n.closest('table,.ant-drawer,.ant-pagination')).map(n=>n.querySelector('.ant-select-selection-item')?.getAttribute('title')||text(n.querySelector('.ant-select-selection-item')));
 const guard=(saved=false)=>{if(!['https://www.kujiale.com','https://beta.kujiale.com','https://yun.kujiale.com','https://yun-beta.kujiale.com'].includes(location.origin)||!/^\/pub\/saas\/workbench\/construction\/drawing_config\/config\/object\/?$/.test(location.pathname)||performance.timeOrigin!==epoch||customer()!==target.expectedCustomerName||!configName().includes(target.expectedConfigName)||(!saved&&source()!==o.expectedStatus))throw Error('Object customer/configuration changed');if(/你已自动进入只读模式|你已进入只读模式|正在修改此配置/.test(text(document.body)))throw Error('Configuration is locked by another editor');};
 const inspect=async p=>globalThis.__drawingObjectConfig({...o,action:'inspect',...p,expectedStatus:source()});
 const chooseSection=async section=>{const v=await inspect({action:'select-section',section});if(v.error)throw Error(v.error);};
 const chooseMajor=async name=>{let a=ns('.ant-select').filter(n=>!n.closest('table,.ant-drawer,.ant-pagination'));if(a.length!==2)throw Error('Two bound configuration/category selectors required');if(text(a[1].querySelector('.ant-select-selection-item'))===name)return;a[1].querySelector('.ant-select-selector').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(120);const d=ns('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');if(d.length!==1)throw Error('Category list unavailable');const holder=d[0].querySelector('.rc-virtual-list-holder');for(let i=0;i<25;i++){const match=ns('.ant-select-item-option',d[0]).filter(n=>(n.getAttribute('title')||text(n))===name);if(match.length===1){match[0].click();await wait(220);return;}if(!holder||holder.scrollTop+holder.clientHeight>=holder.scrollHeight-2)break;holder.scrollTop+=Math.max(20,holder.clientHeight*.8);holder.dispatchEvent(new Event('scroll',{bubbles:true}));await wait(70);}throw Error('Exact major category was not found');};
 const row=()=>{const a=ns('tbody tr[data-row-key]').filter(n=>!n.closest('.ant-drawer')&&n.getAttribute('data-row-key')===o.rowId&&text(n.querySelector('td'))===o.trueCategory);if(a.length!==1)throw Error('Original true category ID/name changed or is not expanded');return a[0];};
 const cell=p=>row().querySelectorAll(':scope > td')[{selectable:1,sectionMode:2,hideSideElevation:3}[p]];
 const menu=async p=>{const v=await inspect({action:'open-property-menu',rowId:o.rowId,trueCategory:o.trueCategory,property:p});if(v.error)throw Error(v.error);const m=ns('.ant-dropdown-menu');if(m.length!==1||!['自定义 随上级','随上级 自定义'].includes(text(m[0])))throw Error('Unique inheritance choices required: '+m.length);return m[0];};
 const readProperties=async()=>{const out={};for(const p of ['selectable','sectionMode','hideSideElevation']){const m=await menu(p),selected=ns('.ant-dropdown-menu-item-selected',m);if(selected.length>1)throw Error('Selected inheritance mode ambiguous');const mode=selected.length===0?'unmarked':text(selected[0])==='自定义'?'custom':text(selected[0])==='随上级'?'parent':null;if(!mode)throw Error('Unknown inheritance mode');const c=cell(p),checkbox=c.querySelector('input[type="checkbox"]');out[p]={mode,value:p==='sectionMode'?text(c.querySelector('.ant-select-selection-item')||c.querySelector('[class*="ObjectConfig-disabled"]')):checkbox?.checked};if(out[p].value===undefined||out[p].value===null)throw Error('Actual property value unavailable');m.dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}));m.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true}));}for(const n of ns('.ant-dropdown-menu,.ant-dropdown-trigger'))n.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true}));await wait(180);return out;};
 const normalize=v=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v;
 const same=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
 const viewRows=()=>ns('tbody tr[data-row-key]').filter(n=>!n.closest('.ant-drawer')).map(n=>({id:n.getAttribute('data-row-key'),cells:[...n.querySelectorAll(':scope > td')].map(c=>({text:text(c).replace(/\(\s*\d+\s*\/\s*\d+\s*\)/g,'').trim(),checked:ns('input[type="checkbox"]',c).map(x=>x.checked)}))}));
 const button=(label,root=document)=>{const a=ns('button',root).filter(n=>compact(n)===label&&!n.disabled);if(a.length!==1)throw Error('Unique '+label+' button required');return a[0];};
 const theme=()=>ns('input[type="radio"]').find(n=>n.checked&&['Light','Dark'].includes(n.value))?.value;
 const styleCell=()=>row().querySelectorAll(':scope > td')[{modelingLine:1,outlineLine:2,sectionLine:5}[o.styleField]];
 const selectTheme=async v=>{const wanted=v==='light'?'Light':'Dark',a=ns('input[type="radio"]').filter(n=>n.value===wanted);if(a.length!==1)throw Error('Theme control unavailable');if(!a[0].checked){a[0].click();await wait(200);}if(theme()!==wanted)throw Error('Theme selection not verified');};
 const styleState=()=>({cellText:text(styleCell()),preview:[...styleCell().querySelectorAll('svg line')].map(n=>({dash:n.getAttribute('stroke-dasharray'),width:n.getAttribute('stroke-width'),color:n.getAttribute('stroke')}))});
 const checkRecord=async rec=>{await chooseSection(rec.kind==='properties'?'properties':'display');await chooseMajor(rec.majorCategory);const prior=o;o={...o,rowId:rec.rowId,trueCategory:rec.trueCategory,styleField:rec.styleField};try{if(rec.kind==='properties'){const actual=await readProperties();if(!same(actual,rec.after))throw Error('Object property readback differs');}else{await selectTheme(rec.theme);if(!same(styleState(),rec.after))throw Error('Object style reference readback differs');}}finally{o=prior;}};
 try{
  if(o.action==='verify'){
   const batch=JSON.parse(sessionStorage.getItem('drawingObjectSaveV1:'+o.receiptIds.join('|'))||'null');if(!batch||!['reload-scheduled','saved'].includes(batch.phase))throw Error('No acknowledged object save available');if(epoch===batch.epoch)return{...r,status:'awaiting-fresh-page'};if(/来自于\s*你的账号(?:\s|$)/.test(source()))return{...r,status:'customer-reload-required',currentStatus:source()};if(batch.records.some(x=>!same(x.target,target)))throw Error('Saved receipt target mismatch');if(!/\/config\/object\/?$/.test(location.pathname)&&customer()===target.expectedCustomerName&&configName().includes(target.expectedConfigName)){const nav=await inspect({action:'open-object'});if(nav.error)throw Error(nav.error);}guard(true);for(const rec of batch.records)await checkRecord(rec);batch.phase='saved';sessionStorage.setItem('drawingObjectSaveV1:'+o.receiptIds.join('|'),JSON.stringify(batch));return{...r,status:'object-save-verified',saved:true,persistedReadback:true,serverApiVerified:false,saveStatus:batch.saveStatus,records:batch.records.map(x=>({kind:x.kind,majorCategory:x.majorCategory,rowId:x.rowId,trueCategory:x.trueCategory,after:x.after}))};
  }
  if(o.action==='save'){const prior=JSON.parse(sessionStorage.getItem('drawingObjectSaveV1:'+o.receiptIds.join('|'))||'null');if(prior){if(['reload-scheduled','saved'].includes(prior.phase))return globalThis.__drawingObjectWrite({...o,action:'verify'});throw Error('Object save already attempted; inspect without resubmission');}}
  guard();
  if(['read-properties','save'].includes(o.action)&&ns('.ant-drawer-content,.ant-modal-content').length)throw Error('Close the existing editor or replacement panel before inspection/save');
  if(o.action==='read-properties'){await chooseSection('properties');if(o.majorCategory)await chooseMajor(o.majorCategory);return{...r,status:'object-properties-observed',rowId:o.rowId,trueCategory:o.trueCategory,properties:await readProperties()};}
  if(o.action==='save'){
   const k='drawingObjectSaveV1:'+o.receiptIds.join('|'),old=JSON.parse(sessionStorage.getItem(k)||'null');if(old){if(['reload-scheduled','saved'].includes(old.phase))return globalThis.__drawingObjectWrite({...o,action:'verify'});throw Error('Save was already attempted; inspect acknowledgement without resubmission');}
   const records=o.receiptIds.map(get);if(records.some(x=>!x||x.phase!=='edited'||!same(x.target,target)))throw Error('Verified object receipts for the same target required');const unique=new Set(records.map(x=>[x.kind,x.rowId,x.theme||'',x.styleField||''].join(':')));if(unique.size!==records.length)throw Error('Overlapping object receipts are not supported in one save');for(const rec of records)await checkRecord(rec);guard();const before=source(),batch={phase:'save-open-attempt-recorded',epoch,records,beforeStatus:before};sessionStorage.setItem(k,JSON.stringify(batch));button('保存').click();r.executed=true;await wait(250);const prefix=('确认将基础配置'+target.expectedConfigName+'保存在'+target.expectedCustomerName).replace(/\s/g,'');const dialogs=ns('[role="dialog"],.ant-modal').filter(n=>compact(n).startsWith(prefix+'?')||compact(n).startsWith(prefix+'？'));const matches=dialogs.filter(n=>!dialogs.some(x=>x!==n&&n.contains(x)));if(matches.length!==1)throw Error('Exact customer save confirmation not observed');batch.phase='save-confirmation-attempt-recorded';sessionStorage.setItem(k,JSON.stringify(batch));button('保存',matches[0]).click();const time=s=>/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.exec(s)?.[0];let ok=false;for(let i=0;i<120;i++){await wait(100);if(customer()===target.expectedCustomerName&&time(source())>time(before)){ok=true;break;}}if(!ok)throw Error('Fresh object save time not observed; do not resubmit');for(const rec of records)await checkRecord(rec);batch.phase='reload-scheduled';batch.saveStatus=source();sessionStorage.setItem(k,JSON.stringify(batch));setTimeout(()=>location.reload(),300);return{...r,status:'object-save-reload-scheduled',saveStatus:batch.saveStatus};
  }
  const signature=JSON.stringify(o),old=get(o.requestId);if(old&&old.signature!==signature)throw Error('Object request parameters changed');if(old&&old.phase!=='preflight'){if(old.signature!==signature)throw Error('Object request parameters changed');if(old.phase==='property-edit-attempt-recorded'&&old.after&&same(old.beforeRows.filter(x=>x.id!==o.rowId),viewRows().filter(x=>x.id!==o.rowId))){const current=await readProperties();if(same(current,old.after)){old.phase='edited';old.afterRows=viewRows();delete old.error;put(o.requestId,old);}}return{...r,status:old.phase==='edited'?'object-fields-verified':'needs-review',receiptId:o.requestId,phase:old.phase,after:old.after,reviewDiff:old.beforeRows?.map(before=>({before,actual:viewRows().find(x=>x.id===before.id)})).filter(x=>x.before.id!==o.rowId&&!same(x.before,x.actual)),error:old.phase==='edited'?undefined:'Previous object edit is uncertain; no blind replay'};}
  if(ns('.ant-drawer-content,.ant-modal-content').length)throw Error('Close the inspected picker before editing');await chooseSection(o.action==='update-properties'?'properties':'display');await chooseMajor(o.majorCategory);row();guard();
  record={target,signature,phase:'preflight',rowId:o.rowId,trueCategory:o.trueCategory,majorCategory:o.majorCategory,kind:o.action==='update-properties'?'properties':'line-style',styleField:o.styleField,theme:o.theme,beforeRows:viewRows()};
  if(o.action==='update-properties'){
   const before=await readProperties();if(!same(before,o.expectedProperties))throw Error('Original property snapshot changed');record.before=before;record.phase='property-edit-attempt-recorded';put(o.requestId,record);r.executed=true;
   for(const p of Object.keys(o.changes)){guard();const desired=o.changes[p],m=await menu(p);const label=desired.mode==='custom'?'自定义':'随上级',selected=ns('.ant-dropdown-menu-item-selected',m);if(selected.length>1)throw Error('Mode selection ambiguous');if(selected.length===0||text(selected[0])!==label){const a=ns('.ant-dropdown-menu-item',m).filter(n=>text(n)===label);if(a.length!==1)throw Error('Explicit inheritance choice unavailable');a[0].click();await wait(180);}else{m.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true}));await wait(120);}if(desired.mode==='parent')continue;
    if(p==='sectionMode'){const c=cell(p),s=c.querySelector('.ant-select:not(.ant-select-disabled) .ant-select-selector');if(!s)throw Error('Custom section mode control unavailable');s.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await wait(120);const choices=ns('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter(n=>(n.getAttribute('title')||text(n))===desired.value);if(choices.length!==1)throw Error('Observed section option not found: '+desired.value);choices[0].click();await wait(180);}
    else{const b=cell(p).querySelector('input[type="checkbox"]');if(!b||b.disabled)throw Error('Custom checkbox unavailable');if(b.checked!==desired.value){b.click();await wait(160);}if(cell(p).querySelector('input[type="checkbox"]')?.checked!==desired.value)throw Error('Checkbox result not verified');}
   }
   record.after=await readProperties();for(const p of Object.keys(before)){const desired=o.changes[p];if(desired){if(record.after[p].mode!==desired.mode||(desired.mode==='custom'&&record.after[p].value!==desired.value))throw Error('Changed property did not match');}else if(!same(before[p],record.after[p]))throw Error('Unrequested property changed');}
  }else if(o.action==='replace-line'){
   await selectTheme(o.theme);record.beforeRows=viewRows();if(text(styleCell())!==o.expectedCellText)throw Error('Original style cell changed');record.before=styleState();const opened=await inspect({action:'open-style-picker',rowId:o.rowId,trueCategory:o.trueCategory,styleField:o.styleField});if(opened.error)throw Error(opened.error);const scan=await inspect({action:'scan-style-candidates'});if(!scan.complete)throw Error('Complete style candidate list required');const found=scan.styleCandidates.filter(x=>x.name===o.replacementName);if(found.length!==1)throw Error('Replacement style name is missing or ambiguous');record.replacement=found[0];const d=ns('.ant-drawer-content');if(d.length!==1)throw Error('Replacement drawer changed');const drawer=d[0];
   // Return to first page; navigate only observed pagination controls until the exact ID appears.
   const first=drawer.querySelector('.ant-pagination-item-1');if(first){first.click();await wait(120);}let candidate;for(let i=0;i<40;i++){candidate=ns('tbody tr[data-row-key]',drawer).find(n=>n.getAttribute('data-row-key')===found[0].id&&text(n.querySelectorAll('td')[1])===found[0].name);if(candidate)break;const next=drawer.querySelector('.ant-pagination-next:not(.ant-pagination-disabled)');if(!next)break;(next.querySelector('button')||next).click();await wait(100);}if(!candidate)throw Error('Exact replacement ID no longer available');
   record.phase='style-replace-attempt-recorded';put(o.requestId,record);guard();r.executed=true;candidate.click();await wait(120);if(!text(drawer.querySelector('.ant-drawer-body')?.firstElementChild).includes('替换为:'+found[0].name))throw Error('Selected replacement label did not match');guard();button('替换',drawer).click();await wait(250);if(ns('.ant-drawer-content').length)throw Error('Replacement drawer did not close');delete globalThis.__drawingObjectPickerOwned;record.after=styleState();if(!record.after.cellText.startsWith(o.replacementName+' '))throw Error('Replaced style label not verified');
  }else throw Error('Unsupported object write');
  const afterRows=viewRows();if(!same(record.beforeRows.filter(x=>x.id!==o.rowId),afterRows.filter(x=>x.id!==o.rowId)))throw Error('Other rendered object rows changed; review inheritance effects');record.phase='edited';record.afterRows=afterRows;put(o.requestId,record);return{...r,status:'object-fields-verified',receiptId:o.requestId,kind:record.kind,rowId:o.rowId,trueCategory:o.trueCategory,before:record.before,after:record.after};
 }catch(e){if(record&&o.requestId){record.error=e.message;put(o.requestId,record);}return{...r,status:r.executed?'needs-review':'blocked',error:e.message,...(record?{receiptId:o.requestId,phase:record.phase,before:record.before,after:record.after}:{})};}
};

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
