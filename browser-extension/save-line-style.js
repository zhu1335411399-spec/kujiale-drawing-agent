import { lineStyleAction } from './line-style-actions.js';

// Browser-host orchestration; no guessed HTTP endpoints and no automatic retries.
export async function saveAndVerifyLineStyle({ chromeApi, tabId, target, styleId, expectedValues, timeoutMs = 15000, workflowAuthorized = false }) {
  const result = { saved: false, persistedReadback: false, serverApiVerified: false, published: false, status: 'blocked' };
  let clicked = false, reloading = false;
  const call = async options => {
    const [response] = await chromeApi.scripting.executeScript({ target: { tabId }, func: lineStyleAction, args: [options] });
    if (!response?.result) throw new Error('No page response');
    return response.result;
  };
  const bound = { expectedConfigName: target?.configName, expectedCustomerName: target?.customerName, ...(workflowAuthorized ? { workflowAuthorized: true } : {}) };
  const match = style => style?.id === styleId && ['name', 'lineType', 'color', 'widthMm', ...(workflowAuthorized ? ['scale'] : [])].every(key => typeof expectedValues?.[key] === 'string' && style[key] === expectedValues[key]);
  try {
    if (!Number.isInteger(tabId) || !styleId || !target?.configName || (!workflowAuthorized && !target.configName.startsWith('MCP样式引用')) || !target?.customerName) throw new Error('Explicit target and style required');
    const initialTab = await chromeApi.tabs.get(tabId);
    const before = await call({ ...bound, action: 'inspect' });
    if (before.status !== 'observed' || before.before.filter(style => style.id === styleId).length !== 1 || !before.before.some(match)) throw new Error('Pre-save target or style mismatch');
    const saved = await call({ ...bound, action: 'save', allowWrite: true, expectedRows: before.before });
    clicked = saved.executed === true;
    if (!clicked || saved.saveAcknowledged !== true) throw new Error('Save acknowledgement not observed; no reload or automatic retry');
    result.saveNotice = saved.saveNotice;
    // Read once more before reload to avoid discarding a concurrent visible edit.
    const postSave = await call({ ...bound, action: 'inspect' });
    if (postSave.status !== 'observed' || JSON.stringify(postSave.before) !== JSON.stringify(before.before)) throw new Error('Page changed after save; reload cancelled');
    if ((await chromeApi.tabs.get(tabId)).url !== initialTab.url) throw new Error('Page navigated before reload');
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = error => { if (settled) return; settled = true; clearTimeout(timer); chromeApi.tabs.onUpdated.removeListener(listener); error ? reject(error) : resolve(); };
      const listener = (id, change) => { if (id === tabId && change.status === 'complete') finish(); };
      const timer = setTimeout(() => finish(new Error('Reload timed out; persistence unknown')), timeoutMs);
      chromeApi.tabs.onUpdated.addListener(listener);
      reloading = true;
      Promise.resolve().then(() => chromeApi.tabs.reload(tabId, { bypassCache: true })).catch(error => finish(error));
    });
    if ((await chromeApi.tabs.get(tabId)).url !== initialTab.url) throw new Error('Reload changed the target URL');
    let fresh;
    for (let attempt = 0; attempt < 15; attempt++) {
      fresh = await call({ ...bound, action: 'inspect' });
      if (fresh.status === 'observed' && fresh.before?.some(match)) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (fresh.status !== 'observed' || fresh.before.filter(style => style.id === styleId).length !== 1 || !fresh.before.some(match)) throw new Error('Fresh-page readback did not confirm the style in the expected configuration');
    result.saved = true; result.persistedReadback = true; result.status = 'save-and-reload-readback-verified';
    result.evidence = { method: 'fresh-business-success-notice-and-cache-bypassed-page-reload', style: fresh.before.find(match),
      limitation: 'No independent server API read was available; application-local persistence and backend durability are not separately proven.' };
  } catch (error) { result.status = clicked ? 'save-outcome-unverified' : 'blocked'; result.error = error.message; }
  result.saveAttempted = clicked; result.reloadAttempted = reloading;
  return result;
}
