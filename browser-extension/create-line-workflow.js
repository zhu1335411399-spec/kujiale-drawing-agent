import { lineStyleAction } from './line-style-actions.js';
import { saveAndVerifyLineStyle } from './save-line-style.js';

export function validateLineRequest(args) {
  for (const key of ['requestId', 'expectedConfigName', 'expectedCustomerName', 'name', 'lineType', 'scale', 'colorIndex', 'widthMm'])
    if (typeof args[key] !== 'string' || !args[key].trim() || args[key].length > 200) throw new Error('Invalid ' + key);
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(args.requestId) || !/^[A-Z0-9_]+$/.test(args.lineType) ||
      !/^\d+(\.\d+)?$/.test(args.scale) || Number(args.scale) <= 0 ||
      !/^\d+$/.test(args.colorIndex) || Number(args.colorIndex) > 255 ||
      !/^\d+(\.\d+)?$/.test(args.widthMm) || Number(args.widthMm) <= 0) throw new Error('Invalid line parameters');
}

export async function createLineWorkflow({ chromeApi, tabId, args }) {
  const result = { requestId: args.requestId, created: false, saved: false, persistedReadback: false, published: false, activated: false };
  let ledgerKey, attempted = false;
  const bound = { expectedConfigName: args.expectedConfigName, expectedCustomerName: args.expectedCustomerName, workflowAuthorized: true };
  const call = async options => {
    const [probe] = await chromeApi.scripting.executeScript({ target: { tabId }, func: lineStyleAction, args: [{ ...bound, ...options }] });
    if (!probe?.result) throw new Error('No browser response'); return probe.result;
  };
  try {
    validateLineRequest(args);
    ledgerKey = 'line-create:' + args.requestId;
    const previous = (await chromeApi.storage.local.get(ledgerKey))[ledgerKey];
    if (previous) return { ...result, status: 'request-already-used', previous, error: 'Inspect the earlier result; do not retry creation' };
    const before = await call({ action: 'inspect' });
    if (before.status !== 'observed') throw new Error(before.error || 'Target not verified');
    // We cannot prove all pages have no duplicate yet. Require a whole-list view.
    const pagination = await chromeApi.scripting.executeScript({ target: { tabId }, func: () => {
      const next = document.querySelector('.ant-pagination-next');
      const active = document.querySelector('.ant-pagination-item-active');
      return { hasNext: !!next && next.getAttribute('aria-disabled') !== 'true' && !next.classList.contains('ant-pagination-disabled'), page: active?.textContent?.trim() || '1' };
    } });
    if (pagination[0]?.result?.hasNext || pagination[0]?.result?.page !== '1') throw new Error('Show all rows on page 1 before creation so duplicate names can be checked');
    if (before.before.some(row => row.name === args.name)) throw new Error('Name already exists; no duplicate created');
    await chromeApi.storage.local.set({ [ledgerKey]: { status: 'creation-request-pending', target: bound, name: args.name, at: new Date().toISOString() } });
    attempted = true;
    const created = await call({ action: 'create', allowWrite: true });
    if (created.status !== 'created-ui-only' || !created.createdRow?.id) throw new Error(created.error || 'Creation outcome uncertain');
    result.created = true; result.styleId = created.createdRow.id;
    let row = created.createdRow;
    for (const [action, value] of [['rename', args.name], ['lineType', args.lineType], ['scale', args.scale], ['colorIndex', args.colorIndex], ['widthMm', args.widthMm]]) {
      const key = action === 'rename' ? 'name' : action === 'colorIndex' ? 'color' : action;
      if (row[key] === value) continue;
      const changed = await call({ action, value, rowId: row.id, allowWrite: true, expectedOriginal: row,
        creationEvidence: { rowId: row.id, name: row.name, configName: args.expectedConfigName, createdAt: new Date().toISOString() } });
      if (changed.status !== 'edited-ui-only') throw new Error(changed.error || 'Field readback failed: ' + action);
      row = changed.after;
    }
    const fresh = await call({ action: 'inspect' });
    const untouched = fresh.before?.filter(r => r.id !== row.id);
    if (fresh.status !== 'observed' || JSON.stringify(untouched) !== JSON.stringify(before.before)) throw new Error('Other rows changed; save cancelled');
    const saved = await saveAndVerifyLineStyle({ chromeApi, tabId,
      target: { configName: args.expectedConfigName, customerName: args.expectedCustomerName }, styleId: row.id, expectedValues: row, workflowAuthorized: true });
    Object.assign(result, { saved: saved.saved, persistedReadback: saved.persistedReadback, evidence: saved.evidence, error: saved.error,
      status: saved.saved ? 'completed' : 'needs-review', serverApiVerified: false });
  } catch (error) { result.status = attempted ? 'needs-review' : 'blocked'; result.error = error.message; }
  if (attempted) await chromeApi.storage.local.set({ [ledgerKey]: result });
  return result;
}
