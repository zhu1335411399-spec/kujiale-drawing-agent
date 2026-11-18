// Invoked only by the explicit extension popup action. Never select an option.
export async function readLineStyleOptions() {
  const visible = node => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
  const text = node => (node?.innerText || node?.textContent || '').trim().replace(/\s+/g, ' ');
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const allowed = ['https://www.kujiale.com', 'https://beta.kujiale.com', 'https://yun.kujiale.com', 'https://yun-beta.kujiale.com'];
  if (!allowed.includes(location.origin) || !/^\/pub\/saas\/workbench\/construction\/drawing_config\/config\/style\/?$/.test(location.pathname)) throw new Error('Open the line-style configuration page first.');
  const initialUrl = location.href;
  const table = [...document.querySelectorAll('table')].filter(visible).find(node => [...node.querySelectorAll('th')].some(cell => text(cell) === '线样式名称'));
  if (!table) throw new Error('Line-style table not found.');
  const headers = [...table.querySelectorAll('th')].map(text);
  const root = table.closest('.ant-table') || table.parentElement;
  const rows = [...root.querySelectorAll('tbody tr[data-row-key]')].filter(visible);
  const row = rows[0];
  if (!row) throw new Error('No visible line-style row.');
  const cells = [...row.querySelectorAll('td')];
  const signature = () => JSON.stringify([...root.querySelectorAll('tbody tr[data-row-key]')].filter(visible).map(node => ({
    id: node.getAttribute('data-row-key'), text: text(node),
    values: [...node.querySelectorAll('input:not([type="checkbox"]),select')].map(input => input.value)
  })));
  const before = signature();
  const identityText = text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
  const result = { version: 2, readerBuild: 'options-close-fix-2', readAt: new Date().toISOString(), url: location.origin + location.pathname,
    sourceConfigText: identityText, rowId: row.getAttribute('data-row-key'), fields: [], complete: false,
    writesExecuted: false, interactions: 'open-scroll-dismiss-only', valuesUnchanged: false };
  // An already open menu belongs to the user's interaction; do not close it.
  if ([...document.querySelectorAll('.ant-select-dropdown')].some(visible)) throw new Error('Close the open dropdown before collecting.');
  for (const field of ['线型', '线宽(mm)']) {
    const index = headers.indexOf(field);
    const cell = index >= 0 ? cells[index] : null;
    const input = cell?.querySelector('input[role="combobox"]');
    const trigger = cell?.querySelector('.ant-select-selector');
    if (!input || !trigger || input.disabled) { result.fields.push({ field, status: 'unsupported-control', complete: false }); continue; }
    const popupId = input.getAttribute('aria-controls') || input.getAttribute('aria-owns');
    if (!popupId || input.getAttribute('aria-expanded') === 'true') throw new Error('Ambiguous dropdown state.');
    const collected = new Map();
    let popup, holder, reachedEnd = false, stableEnd = 0, oldScroll = 0;
    const detail = { field, status: 'partial', selectedBefore: text(cell), options: [], complete: false };
    try {
      if (location.href !== initialUrl || !row.isConnected || signature() !== before) throw new Error('Page or values changed during collection.');
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      for (let attempt = 0; attempt < 10; attempt++) {
        await wait(100);
        popup = document.getElementById(popupId)?.closest('.ant-select-dropdown');
        if (popup && visible(popup)) break;
      }
      if (!popup || !visible(popup)) throw new Error('Dropdown did not open; no selection was attempted.');
      holder = popup.querySelector('.rc-virtual-list-holder');
      oldScroll = holder?.scrollTop || 0;
      if (holder) { holder.scrollTop = 0; holder.dispatchEvent(new Event('scroll', { bubbles: true })); await wait(180); }
      for (let step = 0; step < 25; step++) {
        if (location.href !== initialUrl || !row.isConnected) throw new Error('Page changed during collection.');
        const options = [...popup.querySelectorAll('.ant-select-item-option')].filter(visible);
        const sizeBefore = collected.size;
        for (const option of options) {
          const label = text(option.querySelector('.ant-select-item-option-content') || option);
          if (!label) continue;
          const domValue = option.getAttribute('data-value');
          const key = JSON.stringify([domValue, label]);
          collected.set(key, { label, domValue, valueVerified: domValue !== null,
            disabled: option.classList.contains('ant-select-item-option-disabled') });
        }
        const atEnd = !holder || holder.scrollTop + holder.clientHeight >= holder.scrollHeight - 2;
        stableEnd = atEnd && collected.size === sizeBefore ? stableEnd + 1 : 0;
        if (stableEnd >= 2) { reachedEnd = true; break; }
        if (holder && !atEnd) {
          holder.scrollTop = Math.min(holder.scrollHeight, holder.scrollTop + Math.max(24, holder.clientHeight * 0.75));
          holder.dispatchEvent(new Event('scroll', { bubbles: true }));
        }
        await wait(180);
      }
      detail.options = [...collected.values()];
      detail.traversalReachedEnd = reachedEnd;
      detail.status = reachedEnd ? 'rendered-list-traversed' : 'partial';
      // Traversing the DOM is evidence, not proof of all server-side/lazy-loaded options.
      detail.complete = false;
      detail.limitations = ['Labels are observed UI text; API values remain unverified unless present in DOM.',
        'Lazy loading and duplicate labels may require further verification.'];
    } catch (error) { detail.status = 'failed'; detail.error = error.message; detail.options = [...collected.values()]; }
    finally {
      if (holder?.isConnected) { holder.scrollTop = oldScroll; holder.dispatchEvent(new Event('scroll', { bubbles: true })); }
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      // Wait for the overlay leave animation. Do not toggle its trigger: that can
      // reopen an overlay whose aria state changes before its animation ends.
      for (let attempt = 0; attempt < 4 && popup && visible(popup); attempt++) await wait(100);
      if (popup && visible(popup)) {
        // rc-trigger listens for an outside pointer/mouse down. Target the page
        // body itself, never a form field, option, action, or save button.
        document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
        for (let attempt = 0; attempt < 10 && visible(popup); attempt++) await wait(100);
      }
      detail.closed = !popup || !visible(popup);
    }
    result.fields.push(detail);
    if (location.href !== initialUrl || signature() !== before || !detail.closed) {
      result.status = location.href !== initialUrl || signature() !== before ? 'stopped-state-changed' : 'stopped-popup-not-closed';
      result.valuesUnchanged = location.href === initialUrl && signature() === before;
      return result;
    }
  }
  const colorIndex = headers.indexOf('颜色');
  const color = colorIndex >= 0 ? cells[colorIndex] : null;
  result.fields.push({ field: '颜色', status: 'separate-adapter-needed', complete: false, displayedText: text(color),
    structure: [...(color?.querySelectorAll('*') || [])].slice(0, 25).map(node => ({
      tag: node.tagName.toLowerCase(), classes: typeof node.className === 'string' ? node.className.slice(0, 200) : null,
      role: node.getAttribute('role'), title: node.getAttribute('title'), label: node.getAttribute('aria-label')
    })) });
  result.valuesUnchanged = location.href === initialUrl && signature() === before;
  result.status = result.valuesUnchanged ? 'collection-finished' : 'stopped-state-changed';
  return result;
}
