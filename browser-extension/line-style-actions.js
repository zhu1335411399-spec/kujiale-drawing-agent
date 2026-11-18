// Development adapter. Not wired into the installed bridge until live acceptance.
// One explicit action per invocation; never publish, activate, delete, or import.
export async function lineStyleAction(options = {}) {
  const result = { adapterBuild: 'line-style-actions-2', executed: false, saved: false,
    persistedReadback: false, published: false, status: 'blocked' };
  const visible = node => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
  const text = node => (node?.innerText || node?.textContent || '').trim().replace(/\s+/g, ' ');
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const allowedActions = ['inspect', 'create', 'rename', 'lineType', 'scale', 'widthMm', 'colorIndex', 'save'];
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
    if (options.action === 'inspect') { result.status = 'observed'; return result; }
    if (options.allowWrite !== true) throw new Error('Write execution is not enabled');
    const overlaySelector = ['lineType', 'widthMm'].includes(options.action) ? '.ant-modal,.ant-popover' : '.ant-modal,.ant-popover,.ant-select-dropdown';
    if (options.workflowAuthorized) {
      // Ant Select's closing transition can outlive the field readback.
      for (let attempt = 0; attempt < 10 && [...document.querySelectorAll('.ant-select-dropdown')].some(visible); attempt++) await wait(100);
    }
    if ([...document.querySelectorAll(overlaySelector)].some(visible)) throw new Error('Close existing overlays before writing');
    const button = label => {
      const found = [...document.querySelectorAll('button')].filter(node => visible(node) && text(node) === label && !node.disabled);
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
    if (options.action === 'save') {
      // A click is never promoted to saved:true or persistedReadback:true.
      if (!options.expectedRows || JSON.stringify(result.before) !== JSON.stringify(options.expectedRows)) throw new Error('Rows changed before save');
      const noticeSelector = '[role="alert"],.ant-message-notice,.tui-message,.tui-message-notice';
      const priorNotices = new Set([...document.querySelectorAll(noticeSelector)].filter(visible));
      let successNotice = null;
      const examine = records => {
        for (const notice of [...document.querySelectorAll(noticeSelector)].filter(visible)) {
          const changed = records.some(record => notice.contains(record.target) || [...record.addedNodes || []].some(node => node === notice || node.contains?.(notice)));
          if ((!priorNotices.has(notice) || changed) && /保存成功|保存完成|已保存/.test(text(notice)) && !/失败|未保存|尚未保存/.test(text(notice))) successNotice = text(notice).slice(0, 180);
        }
      };
      const observer = typeof MutationObserver === 'function' ? new MutationObserver(examine) : null;
      observer?.observe(document.body, { subtree: true, childList: true, characterData: true });
      try {
        button('保存').click(); result.executed = true; result.status = 'save-requested-unverified';
        if (observer) for (let attempt = 0; attempt < 30 && !successNotice; attempt++) { await wait(100); examine([]); }
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
    if (!before.name?.startsWith('MCP_TEST_') && !justCreated) throw new Error('Only test styles or a recorded newly created row can be edited');
    if (!options.expectedOriginal || ['name', 'lineType', 'color', 'widthMm', ...(options.workflowAuthorized ? ['scale'] : [])].some(key => before[key] !== options.expectedOriginal[key])) throw new Error('Original values changed');
    if (typeof options.value !== 'string' || !options.value.trim()) throw new Error('Explicit value required');
    const header = { rename: '线样式名称', scale: '线型比例', lineType: '线型', widthMm: '线宽(mm)', colorIndex: '颜色' }[options.action];
    const cell = [...row.querySelectorAll('td')][headers.indexOf(header)];
    if (!cell) throw new Error('Expected column is missing');
    if (options.action === 'rename' || options.action === 'scale') {
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
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inputs[0], options.value);
      result.executed = true;
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
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
        const input = inputs[0];
        for (const [attribute, compare] of [['min', (v, bound) => v >= bound], ['max', (v, bound) => v <= bound]]) {
          const bound = input.getAttribute(attribute) ?? input.getAttribute('aria-value' + attribute);
          if (bound !== null && bound !== '' && !compare(Number(options.value), Number(bound))) throw new Error('Color index exceeds the observed input range');
        }
        guard();
        input.focus?.();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, options.value);
        result.executed = true;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof KeyboardEvent === 'function') {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        }
        const confirm = [...panel.querySelectorAll('button')].filter(n => visible(n) && !n.disabled && ['确定','确认','应用'].includes(text(n)));
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
    await wait(150); guard();
    result.after = snapshot(row);
    const changedKey = options.action === 'rename' ? 'name' : options.action === 'colorIndex' ? 'color' : options.action;
    if (result.after[changedKey] !== options.value || ['name', 'lineType', 'color', 'widthMm', ...(options.workflowAuthorized && options.action !== 'lineType' ? ['scale'] : [])].some(key => key !== changedKey && before[key] !== result.after[key])) throw new Error('UI readback mismatch');
    result.status = 'edited-ui-only';
  } catch (error) { result.status = result.executed ? 'stopped-review-required' : 'blocked'; result.error = error.message; }
  return result;
}
