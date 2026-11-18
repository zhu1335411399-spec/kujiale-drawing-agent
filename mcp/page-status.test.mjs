import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { collectPages, browserProfileScope } from '../browser-extension/page-check.js';

const design = { id: 2, windowId: 3, url: 'https://yun-beta.kujiale.com/tool/h5/bim', title: 'design' };
const config = { id: 1, windowId: 3, url: 'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/style', title: 'config' };
function apiFor(initial) {
  const state = { tabs: initial.map(tab => ({ ...tab })), probes: 0, afterProbe: null, afterGet: null };
  const api = {
    tabs: {
      query: async () => state.tabs.map(tab => ({ ...tab })),
      get: async id => {
        const tab = state.tabs.find(tab => tab.id === id);
        if (!tab) throw new Error('No tab');
        const result = { ...tab };
        state.afterGet?.();
        return result;
      }
    },
    scripting: { executeScript: async ({ target }) => {
      state.probes++;
      const tab = state.tabs.find(tab => tab.id === target.tabId);
      if (!tab) throw new Error('No tab');
      const probe = { result: { href: tab.url, title: tab.title, ready: 'complete', hasContent: true } };
      state.afterProbe?.();
      return [probe];
    } }
  };
  return { state, api };
}

test('closed design page disappears on the next fresh query', async () => {
  const { state, api } = apiFor([config, design]);
  assert.equal((await collectPages(api)).pages.length, 2);
  state.tabs = [config];
  const result = await collectPages(api);
  assert.deepEqual(result.pages.map(page => page.role), ['config']);
});
test('a page closed during probing cannot survive the final live check', async () => {
  const { state, api } = apiFor([design]);
  state.afterProbe = () => { state.tabs = []; };
  assert.equal((await collectPages(api)).pages.length, 0);
});
test('a page closed after get is also removed', async () => {
  const { state, api } = apiFor([design]);
  state.afterGet = () => { state.tabs = []; };
  assert.equal((await collectPages(api)).pages.length, 0);
});
test('navigation to another target or login cannot reuse a successful probe', async () => {
  const { state, api } = apiFor([design]);
  state.afterProbe = () => { state.tabs[0].url = 'https://yun-beta.kujiale.com/login'; };
  assert.equal((await collectPages(api)).pages.length, 0);
});
test('a generic BIM page is never reported as a verified construction workspace', async () => {
  const { api } = apiFor([design]);
  const { pages } = await collectPages(api);
  assert.equal(pages[0].connected, true);
  assert.equal(pages[0].constructionWorkspaceVerified, false);
});
test('discarded pages are not woken or declared accessible', async () => {
  const { state, api } = apiFor([{ ...design, discarded: true }]);
  assert.equal((await collectPages(api)).pages[0].connected, false);
  assert.equal(state.probes, 0);
});
test('current browser profiles are isolated and clearly named', async () => {
  const chrome = apiFor([config]), edge = apiFor([design]);
  assert.deepEqual((await collectPages(chrome.api)).pages.map(page => page.role), ['config']);
  assert.deepEqual((await collectPages(edge.api)).pages.map(page => page.role), ['design']);
  assert.equal(browserProfileScope('Chrome/140 Edg/140').browser, 'Edge');
  assert.equal(browserProfileScope('Chrome/140').browser, 'Chrome');
});
test('script errors never yield a connected page', async () => {
  const { api } = apiFor([design]);
  api.scripting.executeScript = async () => { throw new Error('Forbidden'); };
  assert.equal((await collectPages(api)).pages[0].connected, false);
});

