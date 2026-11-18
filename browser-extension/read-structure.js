// Generic current-page structure only; never navigate, click, or change values.
export function readConfigStructure() {
  const visible = node => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
  const text = node => (node?.innerText || node?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 180);
  const allowed = ['https://www.kujiale.com', 'https://beta.kujiale.com', 'https://yun.kujiale.com', 'https://yun-beta.kujiale.com'];
  if (!allowed.includes(location.origin) || !location.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/')) return { status: 'unsupported-page', complete: false };
  const categories = ['样式配置', '对象配置', '注释配置', '视图配置', '表格配置', '图纸配置', '下载配置', '参数配置', '页面配置', '其他配置', '历史版本'];
  const selectedLabels = [...document.querySelectorAll('.ant-menu-item-selected,[aria-current="page"]')].filter(visible).map(text);
  const links = [...document.querySelectorAll('a[href]')].filter(visible).flatMap(node => {
    try {
      const url = new URL(node.getAttribute('href'), location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/pub/saas/workbench/construction/drawing_config/')) return [];
      return [{ label: text(node), path: url.pathname, current: url.pathname === location.pathname }];
    } catch { return []; }
  });
  const tables = [...document.querySelectorAll('table')].filter(visible);
  const fields = [...document.querySelectorAll('input,select,textarea,[role="combobox"],[role="switch"]')].filter(visible);
  const safeFields = fields.filter(node => !['password', 'hidden'].includes(node.getAttribute('type')) && !/password|token|secret|authorization/i.test([node.id, node.getAttribute('name')].join(' ')));
  return { version: 1, readerBuild: 'config-structure-1', status: 'structure-observed',
    readAt: new Date().toISOString(), url: location.origin + location.pathname,
    category: categories.find(category => selectedLabels.includes(category)) || null,
    categoryEvidence: selectedLabels, navigation: links.slice(0, 40), navigationTruncated: links.length > 40,
    tabs: [...document.querySelectorAll('[role="tab"]')].filter(visible).slice(0, 30).map(node => ({ label: text(node), selected: node.getAttribute('aria-selected') })),
    tables: tables.slice(0, 8).map(table => ({ headers: [...table.querySelectorAll('th')].map(text),
      renderedRows: [...table.querySelectorAll('tbody tr')].filter(visible).length })),
    tablesTruncated: tables.length > 8,
    fields: safeFields.slice(0, 80).map(node => ({ tag: node.tagName.toLowerCase(), type: node.getAttribute('type'),
      role: node.getAttribute('role'), id: node.id || null, label: node.getAttribute('aria-label') ||
        text(node.closest('.ant-form-item')?.querySelector('label')) || null,
      disabled: Boolean(node.disabled || node.getAttribute('aria-disabled') === 'true'),
      readOnly: Boolean(node.readOnly), expanded: node.getAttribute('aria-expanded') })),
    fieldsTruncated: safeFields.length > 80, writesExecuted: false, interactionsExecuted: false, complete: false,
    limitations: ['Current rendered page only; no other categories were opened.',
      'Structure metadata is not category-specific configuration data or full option enumeration.'] };
}
