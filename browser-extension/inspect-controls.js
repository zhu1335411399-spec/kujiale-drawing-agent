// Read only: no clicks, input events, network calls, or configuration changes.
// Self-contained because Chrome serializes this function into the page.
export function inspectLineStyleControls() {
  const visible = node => Boolean(node?.getClientRects().length) &&
    !['hidden', 'collapse'].includes(getComputedStyle(node).visibility);
  const text = node => (node?.innerText || node?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160);
  const originAllowed = ['https://www.kujiale.com', 'https://beta.kujiale.com', 'https://yun.kujiale.com', 'https://yun-beta.kujiale.com'].includes(location.origin);
  if (!originAllowed || !/^\/pub\/saas\/workbench\/construction\/drawing_config\/config\/style\/?$/.test(location.pathname)) {
    return { version: 1, status: 'not-line-style-page', writesExecuted: false };
  }
  const tables = [...document.querySelectorAll('table')].filter(visible);
  const headerTable = tables.find(table => [...table.querySelectorAll('th')].some(cell => text(cell) === '线样式名称'));
  if (!headerTable) return { version: 1, status: 'table-not-found', writesExecuted: false };
  const headers = [...headerTable.querySelectorAll('th')].map(text);
  const root = headerTable.closest('.ant-table') || headerTable.parentElement;
  const rows = [...root.querySelectorAll('tbody tr[data-row-key]')].filter(visible);
  const fields = ['线型', '颜色', '线宽(mm)'];
  const describe = node => ({
    tag: node.tagName.toLowerCase(), role: node.getAttribute('role'),
    id: node.id || null, classes: typeof node.className === 'string' ? node.className.slice(0, 200) : null,
    type: node.getAttribute('type'), expanded: node.getAttribute('aria-expanded'),
    controls: node.getAttribute('aria-controls'), owns: node.getAttribute('aria-owns'),
    hasPopup: node.getAttribute('aria-haspopup'), disabled: Boolean(node.disabled || node.getAttribute('aria-disabled') === 'true'),
    readOnly: Boolean(node.readOnly)
  });
  const samples = rows.slice(0, 3).map(row => {
    const cells = [...row.querySelectorAll('td')];
    return {
      rowId: row.getAttribute('data-row-key'),
      fields: fields.map(field => {
        const index = headers.indexOf(field);
        const cell = index >= 0 ? cells[index] : null;
        if (!cell) return { field, status: 'column-not-found', complete: false };
        const controls = [...cell.querySelectorAll('input,select,button,[role="combobox"],.ant-select,.ant-select-selector,[aria-haspopup],[tabindex]')].filter(visible);
        const nativeSelects = [...cell.querySelectorAll('select')].filter(visible).map(select => ({
          id: select.id || null, total: select.options.length,
          options: [...select.options].slice(0, 150).map(option => ({ value: option.value, label: text(option), disabled: option.disabled })),
          complete: select.options.length <= 150, scope: 'native-select-dom'
        }));
        const colorNodes = field === '颜色' ? [cell, ...cell.querySelectorAll('*')].filter(visible) : [];
        const colorStructure = colorNodes.slice(0, 30).map(node => ({ ...describe(node),
          title: node.getAttribute('title'), label: node.getAttribute('aria-label'),
          backgroundColor: getComputedStyle(node).backgroundColor || null,
          cursor: getComputedStyle(node).cursor || null }));
        return { field, status: 'inspected', displayedText: text(cell), controls: controls.slice(0, 15).map(describe),
          controlsTruncated: controls.length > 15, nativeSelects, complete: false,
          ...(field === '颜色' ? { colorStructure, colorStructureTruncated: colorNodes.length > 30 } : {}) };
      })
    };
  });
  // Only popup nodes explicitly linked to target cells. Never scrape unrelated menus.
  const popupIds = new Set(samples.flatMap(row => row.fields.flatMap(field => (field.controls || []).flatMap(control =>
    [control.controls, control.owns].filter(Boolean).flatMap(value => value.split(/\s+/))))));
  const linkedPopups = [...popupIds].slice(0, 20).map(id => {
    const popup = document.getElementById(id);
    if (!popup || !visible(popup)) return { id, visible: false, complete: false };
    const options = [...popup.querySelectorAll('[role="option"],option')].filter(visible);
    return { id, visible: true, renderedOptionCount: options.length,
      options: options.slice(0, 150).map(option => ({ label: text(option), value: option.getAttribute('data-value') ?? option.getAttribute('value'),
        selected: option.getAttribute('aria-selected'), position: option.getAttribute('aria-posinset'), setSize: option.getAttribute('aria-setsize') })),
      complete: false, scope: 'linked-rendered-dom-only' };
  });
  return { version: 2, inspectorBuild: 'color-structure-2', status: 'inspected', readAt: new Date().toISOString(), writesExecuted: false,
    interactionsExecuted: false, headers, rowsOnPage: rows.length, sampleLimit: 3, samples, linkedPopups,
    complete: false, limitations: ['No dropdown was opened or scrolled.', 'Rendered options do not establish the full option set.',
      'Unlinked color palettes and virtualized options require a separate verified adapter.'] };
}
