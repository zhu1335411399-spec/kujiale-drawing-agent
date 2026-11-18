import { lineStyleAction } from './line-style-actions.js';
import { saveAndVerifyLineStyle } from './save-line-style.js';

export async function createTestLineStyle({ chromeApi, tabId, args }) {
  const result = { created: false, saved: false, persistedReadback: false, published: false, activated: false, status: 'blocked' };
  const bound = { expectedConfigName: args.expectedConfigName, expectedCustomerName: args.expectedCustomerName };
  const call = async action => {
    const [response] = await chromeApi.scripting.executeScript({ target: { tabId }, func: lineStyleAction, args: [{ ...bound, ...action }] });
    if (!response?.result) throw new Error('Page adapter did not return a result');
    return response.result;
  };
  try {
    if (!/^MCP_TEST_[A-Za-z0-9_-]{1,80}$/.test(args.name || '') || !args.expectedConfigName?.startsWith('MCP样式引用') || !args.expectedCustomerName) throw new Error('Explicit test configuration, customer, and unique MCP_TEST_ name required');
    const originalTab = await chromeApi.tabs.get(tabId);
    const before = await call({ action: 'inspect' });
    if (before.status !== 'observed') throw new Error(before.error || 'Target inspection failed');
    if (before.before.some(style => style.name === args.name)) throw new Error('Test name already exists on this page; no creation attempted');
    const creation = await call({ action: 'create', allowWrite: true });
    result.creation = creation;
    if (creation.executed) result.creationAttempted = true;
    if (creation.status !== 'created-ui-only' || !creation.createdRow?.id) throw new Error(creation.error || 'New row not identified; creation outcome unknown, do not retry');
    result.created = true; result.styleId = creation.createdRow.id;
    if ((await chromeApi.tabs.get(tabId)).url !== originalTab.url) throw new Error('Page changed after creation');
    const renamed = await call({ action: 'rename', allowWrite: true, rowId: result.styleId, value: args.name,
      expectedOriginal: creation.createdRow, creationEvidence: { rowId: result.styleId, name: creation.createdRow.name,
        configName: args.expectedConfigName, createdAt: new Date().toISOString() } });
    result.rename = renamed;
    if (renamed.status !== 'edited-ui-only') throw new Error(renamed.error || 'New-row naming could not be verified');
    const saved = await saveAndVerifyLineStyle({ chromeApi, tabId,
      target: { configName: args.expectedConfigName, customerName: args.expectedCustomerName }, styleId: result.styleId, expectedValues: renamed.after });
    result.save = saved;
    result.saved = saved.saved; result.persistedReadback = saved.persistedReadback;
    result.status = saved.saved && saved.persistedReadback ? 'created-saved-page-readback-verified' : 'created-save-unverified';
  } catch (error) {
    result.status = result.created || result.creationAttempted ? 'stopped-review-required' : 'blocked'; result.error = error.message;
  }
  return result;
}
