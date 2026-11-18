// One explicit UI action; never edits fields or saves.
export async function newLineOnly(options) {
  const result = { executed: false, saved: false, published: false };
  const visible = n => !!n?.getClientRects().length && getComputedStyle(n).visibility !== 'hidden';
  const text = n => (n?.innerText || n?.textContent || '').trim().replace(/\s+/g, ' ');
  if (location.origin !== 'https://www.kujiale.com' || !/^\/pub\/saas\/workbench\/construction\/drawing_config\/config\/style\/?$/.test(location.pathname)) throw new Error('Not the line-style page');
  const status = text(document.querySelector('[class*="TopBarRightComponent-configDesc"]'));
  if (!options.expectedStatus || status !== options.expectedStatus) throw new Error('Configuration changed; read context again');
  const key = '__drawingNewLineOnlyV1';
  const ledger = JSON.parse(sessionStorage.getItem(key) || '{}');
  if (ledger[options.requestId]) return { ...ledger[options.requestId], repeated: true };
  if ([...document.querySelectorAll('.ant-modal,.ant-popover,.ant-select-dropdown')].some(visible)) throw new Error('Close overlays first');
  const tables = [...document.querySelectorAll('table')].filter(n => visible(n) && [...n.querySelectorAll('th')].some(h => text(h) === '线样式名称'));
  if (tables.length !== 1) throw new Error('Line-style table is ambiguous');
  const table = tables[0], headers = [...table.querySelectorAll('th')].map(text);
  const rows = () => [...table.querySelectorAll('tbody tr[data-row-key]')].filter(visible);
  const ids = new Set(rows().map(n => n.getAttribute('data-row-key')));
  const buttons = [...document.querySelectorAll('button')].filter(n => visible(n) && !n.disabled && text(n) === '新建样式');
  if (buttons.length !== 1) throw new Error('New-style button is ambiguous');
  ledger[options.requestId] = { ...result, status: 'attempt-recorded-do-not-retry' };
  sessionStorage.setItem(key, JSON.stringify(ledger));
  buttons[0].click(); result.executed = true;
  result.status = 'creation-outcome-unknown';
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (!table.isConnected || text(document.querySelector('[class*="TopBarRightComponent-configDesc"]')) !== status) break;
    const added = rows().filter(n => !ids.has(n.getAttribute('data-row-key')));
    if (added.length > 1) break;
    if (added.length === 1) {
      const cell = added[0].querySelectorAll('td')[headers.indexOf('线样式名称')];
      result.style = { id: added[0].getAttribute('data-row-key'), name: cell?.querySelector('input')?.value || text(cell) };
      result.status = 'created-ui-only'; break;
    }
  }
  ledger[options.requestId] = result; sessionStorage.setItem(key, JSON.stringify(ledger));
  return result;
}
