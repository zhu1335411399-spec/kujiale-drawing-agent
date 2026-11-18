import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../browser-extension/read-structure.js', import.meta.url), 'utf8');
const { readConfigStructure } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function fixture() {
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/object', href: 'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/object' };
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });
  const selected = { innerText: '对象配置', getClientRects: () => [1] };
  globalThis.document = { querySelectorAll: selector => selector.startsWith('.ant-menu') ? [selected] : [] };
}
test('observes a category without claiming its records are supported', () => {
  fixture();
  const result = readConfigStructure();
  assert.equal(result.category, '对象配置');
  assert.equal(result.status, 'structure-observed');
  assert.equal(result.complete, false);
  assert.equal(result.interactionsExecuted, false);
});
test('refuses foreign origins', () => {
  fixture(); location.origin = 'https://other.example';
  assert.equal(readConfigStructure().status, 'unsupported-page');
});
