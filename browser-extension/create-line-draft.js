import { lineStyleAction } from './line-style-actions.js';
import {withTrustedLineInputs} from './trusted-line-input.js';

// Explicit draft only: no save, reload, publish, activation, import or deletion.
export async function createLineDraft({ chromeApi, tabId, args }) {
  if(chromeApi.debugger&&!args.trustedInputActive)return withTrustedLineInputs({chromeApi,tabId,values:{rename:args.name,colorIndex:args.colorIndex},target:args,
    run:()=>createLineDraft({chromeApi,tabId,args:{...args,trustedInputActive:true}})});
  const result = { created: false, saved: false, published: false, status: 'blocked' };
  const key = 'line-draft:' + args.requestId;
  let attempted = false;
  const bound = { expectedConfigName: args.expectedConfigName, expectedCustomerName: args.expectedCustomerName, workflowAuthorized: true };
  const call = async a => {
    const [p] = await chromeApi.scripting.executeScript({ target: { tabId }, func: lineStyleAction, args: [{ ...bound, ...a }] });
    if (!p?.result) throw Error('No result; do not repeat creation');
    return p.result;
  };
  try {
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(args.requestId || '') || !args.name?.trim() || args.name.length > 100 ||
        !/^[A-Z0-9_]+$/.test(args.lineType || '') || !/^\d+$/.test(args.colorIndex || '') || Number(args.colorIndex) > 255 ||
        !/^\d+(\.\d+)?$/.test(args.widthMm || '') || Number(args.widthMm) <= 0) throw Error('Invalid draft parameters');
    const prior = (await chromeApi.storage.local.get(key))[key];
    const resume = prior?.created === true && prior.status === 'needs-review' && prior.style?.id;
    if (prior && !resume) return { ...result, status: 'request-already-used', prior };
    const before = await call({ action: 'inspect' });
    if (before.status !== 'observed') throw Error(before.error || 'Target not verified');
    let row;
    if (resume) {
      const matches = before.before.filter(r => r.id === prior.style.id);
      if (matches.length !== 1 || ['name','lineType','color','widthMm','scale'].some(k=>matches[0][k]!==prior.style[k])) throw Error('Recorded draft changed; no retry or creation');
      row=matches[0]; result.resumed=true; attempted=true;
    } else {
      if (before.before.some(r => r.name === args.name)) throw Error('Name exists on this page; no creation');
      await chromeApi.storage.local.set({ [key]: { status: 'attempt-recorded', name: args.name, target: bound } });
      attempted = true;
      const created = await call({ action: 'create', allowWrite: true });
      if (created.status !== 'created-ui-only' || !created.createdRow?.id) throw Error(created.error || 'Creation outcome unknown; inspect before any retry');
      row=created.createdRow;
    }
    result.created = true; result.style = row;
    for (const [action, value] of [['rename',args.name],['lineType',args.lineType],['colorIndex',args.colorIndex],['widthMm',args.widthMm]]) {
      const field = action === 'rename' ? 'name' : action === 'colorIndex' ? 'color' : action;
      if (row[field] === value) continue;
      const r = await call({ action, value, allowWrite: true, rowId: row.id, expectedOriginal: row,
        creationEvidence: { rowId: row.id, name: row.name, configName: args.expectedConfigName, createdAt: new Date().toISOString() } });
      if (r.status !== 'edited-ui-only') throw Error(r.error || 'Field could not be verified: '+action);
      row = r.after; result.style = row;
    }
    const after = await call({ action: 'inspect' });
    const matching = after.before?.filter(r => r.id === row.id && r.name === args.name);
    if (after.status !== 'observed' || matching?.length !== 1 || ['lineType','widthMm'].some(k=>matching[0][k]!==args[k]) || matching[0].color !== args.colorIndex) throw Error('Final readback mismatch');
    result.style = matching[0]; result.status = 'draft-fields-verified'; result.duplicateCheckScope = 'current-page';
  } catch(e) { result.error = e.message; result.status = attempted ? 'needs-review' : 'blocked'; }
  if(attempted) await chromeApi.storage.local.set({[key]:result});
  return result;
}
