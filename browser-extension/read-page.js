// Self-contained function copied by chrome.scripting.executeScript into an isolated world.
export function readDrawingPage(options = {}) {
  const text = node => (node?.innerText || node?.textContent || '').trim().replace(/\s+/g, ' ');
  const visible = node => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
  const cleanUrl = location.origin + location.pathname;
  const selected = document.querySelector('#rc_select_0')?.closest('.ant-select')?.querySelector('.ant-select-selection-item');
  const configuration = document.querySelector('[class*="TopBarRightComponent-configDesc"]');
  const label = document.querySelector('[class*="LogoBlock-ep-name"]');
  const notice = document.body?.innerText.includes('你正在登录客户账号') || false;
  const isConfig = location.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/');
  const identity = {
    accountDisplayName: text(label) || null,
    identityVerification: 'display-label-only',
    accountId: null,
    customerLoginNotice: notice,
    customerConfigLoaded: 'unknown',
    configName: isConfig ? text(selected) || null : null,
    configStatusText: isConfig ? text(configuration) || null : null,
    configOwnerId: null
  };
  const result = {
    url: cleanUrl, title: document.title, role: isConfig ? 'config' : 'design',
    readAt: new Date().toISOString(), identity,
    evidence: {
      accountLabelSelector: '[class*="LogoBlock-ep-name"]',
      configNameSelector: '#rc_select_0 -> .ant-select-selection-item',
      configStatusSelector: '[class*="TopBarRightComponent-configDesc"]'
    },
    limitations: ['显示名称不能证明账号 ID、客户配置归属或配置已载入。']
  };
  if (options.kind !== 'styles') return result;
  if (!isConfig || !/\/config\/style\/?$/.test(location.pathname)) throw new Error('请在目标配置页打开样式配置的线样式标签，再读取');
  const tables = [...document.querySelectorAll('table')].filter(visible);
  const headerTable = tables.find(table => [...table.querySelectorAll('th')].some(cell => text(cell) === '线样式名称'));
  if (!headerTable) throw new Error('未找到线样式表头，请打开线样式标签并等待页面加载');
  const headers = [...headerTable.querySelectorAll('th')].map(text);
  const columns = ['线样式名称', '线型', '线型比例', '颜色', '线宽(mm)'].map(name => headers.indexOf(name));
  if (columns.some(index => index < 0)) throw new Error('线样式表结构已变化，需要更新读取器');
  const root = headerTable.closest('.ant-table') || headerTable.parentElement;
  const value = cell => {
    const inputs = [...cell.querySelectorAll('input:not([type="checkbox"])')].filter(visible);
    return inputs.find(input => input.value)?.value || text(cell.querySelector('.ant-select-selection-item')) || text(cell);
  };
  const rows = [...root.querySelectorAll('tbody tr[data-row-key]')].filter(visible).map(row => {
    const cells = [...row.querySelectorAll('td')];
    if (cells.length <= Math.max(...columns)) throw new Error('线样式数据列不完整');
    const [name, lineType, scale, color, widthMm] = columns.map(index => value(cells[index]));
    return { id: row.getAttribute('data-row-key'), name, lineType, scale: scale || null, color: color || null, widthMm: widthMm || null };
  });
  const filtered = rows.filter(row => !options.name || row.name.includes(options.name));
  const offset = options.offset || 0;
  const limit = options.limit || 10;
  result.styles = filtered.slice(offset, offset + limit);
  result.pagination = {
    scope: 'current-rendered-web-page',
    rowsOnWebPage: rows.length, matchingRows: filtered.length,
    offset, limit, hasMore: offset + limit < filtered.length,
    webPage: text(document.querySelector('.ant-pagination-item-active')) || null
  };
  result.limitations.push('只覆盖当前网页分页中已渲染的记录。');
  return result;
}

