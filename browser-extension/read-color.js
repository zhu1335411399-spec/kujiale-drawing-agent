// Probe only the current-color trigger observed in the real table. No color selection.
export async function readLineColorPanel() {
  const visible = node => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
  const text = node => (node?.innerText || node?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160);
  const classes = node => typeof node?.className === 'string' ? node.className.slice(0, 200) : '';
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const allowed = ['https://www.kujiale.com', 'https://beta.kujiale.com', 'https://yun.kujiale.com', 'https://yun-beta.kujiale.com'];
  if (!allowed.includes(location.origin) || !/^\/pub\/saas\/workbench\/construction\/drawing_config\/config\/style\/?$/.test(location.pathname)) throw new Error('Open the line-style configuration page.');
  const initialUrl = location.href;
  const table = [...document.querySelectorAll('table')].filter(visible).find(node => [...node.querySelectorAll('th')].some(cell => text(cell) === '线样式名称'));
  if (!table) throw new Error('Line-style table not found.');
  const headers = [...table.querySelectorAll('th')].map(text);
  const root = table.closest('.ant-table') || table.parentElement;
  const rows = [...root.querySelectorAll('tbody tr[data-row-key]')].filter(visible);
  const row = rows[0];
  const colorIndex = headers.indexOf('颜色');
  const cell = row && colorIndex >= 0 ? [...row.querySelectorAll('td')][colorIndex] : null;
  const triggers = [...(cell?.querySelectorAll('[class*="ColorPickerPanel-colorBlock"]') || [])].filter(visible);
  if (triggers.length !== 1) throw new Error('Current-color trigger is missing or ambiguous.');
  const overlaysSelector = '.ant-popover,.ant-modal,.ant-dropdown,.ant-select-dropdown,[role="dialog"],[class*="ColorPicker"],[class*="colorPicker"],[class*="color-picker"]';
  const existing = new Set([...document.querySelectorAll(overlaysSelector)].filter(visible));
  if ([...document.querySelectorAll('.ant-popover,.ant-modal,.ant-dropdown,.ant-select-dropdown,[role="dialog"]')].some(visible)) throw new Error('Close the open popup first.');
  const signature = () => JSON.stringify([...root.querySelectorAll('tbody tr[data-row-key]')].filter(visible).map(node => ({
    id: node.getAttribute('data-row-key'), text: text(node),
    values: [...node.querySelectorAll('input:not([type="checkbox"]),select')].map(input => input.value),
    swatches: [...node.querySelectorAll('[class*="ColorPickerPanel-colorBlock"]')].map(swatch => getComputedStyle(swatch).backgroundColor)
  })));
  const before = signature();
  const result = { version: 1, readerBuild: 'color-panel-probe-1', readAt: new Date().toISOString(),
    url: location.origin + location.pathname, sourceConfigText: text(document.querySelector('[class*="TopBarRightComponent-configDesc"]')),
    rowId: row.getAttribute('data-row-key'), selectedBefore: text(cell), writesExecuted: false, complete: false,
    interactions: 'open-dismiss-only', valuesUnchanged: false, panels: [], status: 'partial' };
  const newVisible = () => [...document.querySelectorAll(overlaysSelector)].filter(node => visible(node) && !existing.has(node));
  let opened = [];
  try {
    triggers[0].click();
    for (let attempt = 0; attempt < 10; attempt++) {
      await wait(100);
      opened = newVisible();
      if (opened.length) break;
    }
    if (!opened.length) throw new Error('No identifiable color panel appeared.');
    // Keep only outermost new color/popup containers to avoid duplicate capture.
    const panels = opened.filter(node => !opened.some(other => other !== node && other.contains(node))).slice(0, 3);
    if (panels.length !== 1) throw new Error('Color panel ownership is ambiguous.');
    result.panels = panels.map(panel => {
      const nodes = [panel, ...panel.querySelectorAll('*')].filter(visible);
      const swatches = nodes.filter(node => {
        const style = getComputedStyle(node);
        return /color|swatch|palette/i.test(classes(node)) && style.backgroundColor && !['transparent', 'rgba(0, 0, 0, 0)'].includes(style.backgroundColor);
      });
      return {
        classes: classes(panel), role: panel.getAttribute('role'),
        nodeCount: nodes.length, truncated: nodes.length > 400,
        structure: nodes.slice(0, 400).map(node => ({ tag: node.tagName.toLowerCase(), classes: classes(node),
          role: node.getAttribute('role'), title: node.getAttribute('title'), label: node.getAttribute('aria-label') })),
        tabs: nodes.filter(node => node.getAttribute('role') === 'tab').map(node => ({ label: text(node), selected: node.getAttribute('aria-selected') })),
        inputs: nodes.filter(node => ['INPUT', 'SELECT'].includes(node.tagName)).slice(0, 30).map(node => ({
          tag: node.tagName.toLowerCase(), type: node.getAttribute('type'), placeholder: node.getAttribute('placeholder'),
          label: node.getAttribute('aria-label'), min: node.getAttribute('min'), max: node.getAttribute('max'),
          value: /^(?:#[\da-f]{3,8}|\d{1,3}|rgba?\([\d\s,.]+\))$/i.test(node.value || '') ? node.value : null
        })),
        buttons: nodes.filter(node => node.tagName === 'BUTTON').slice(0, 20).map(node => ({ label: text(node), disabled: Boolean(node.disabled) })),
        renderedSwatches: swatches.slice(0, 300).map(node => ({ color: getComputedStyle(node).backgroundColor,
          title: node.getAttribute('title'), label: node.getAttribute('aria-label'), index: node.getAttribute('data-index'),
          value: node.getAttribute('data-value') })),
        swatchesTruncated: swatches.length > 300, scope: 'currently-rendered-panel-only', complete: false
      };
    });
    result.status = 'panel-observed';
  } catch (error) { result.status = 'failed'; result.error = error.message; }
  finally {
    if (location.href === initialUrl) {
      // No click, Enter, or form blur on an option or color input.
      document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      for (let attempt = 0; attempt < 10 && newVisible().length; attempt++) await wait(100);
    }
    result.closed = location.href === initialUrl && newVisible().length === 0;
    result.valuesUnchanged = location.href === initialUrl && row.isConnected && signature() === before;
    if (!result.valuesUnchanged) result.status = 'stopped-state-changed';
    else if (!result.closed) result.status = 'stopped-popup-not-closed';
  }
  return result;
}
