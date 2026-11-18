import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readEncryptedConfig } from '../browser-extension/read-encrypted-config.js';
test('reuses encrypted client with observed headers and checks returned root ID', async () => {
  const previous = Object.fromEntries(['location', 'window', 'document', 'performance'].map(k => [k, globalThis[k]]));
  const root = 'test-root'; let requests = 0, mismatch = false;
  const pkg = key => {
    assert.equal(key, './http');
    return { getEncryptedClient(plugins) { return { async get(url, options) {
      requests++; assert.equal(url, '/dcs-drawing/site/api/open/config/full/get');
      assert.equal(options.params.obsRootConfigId, root);
      const request = plugins.reduce((r, plugin) => plugin.request.beforeSend(r), {});
      assert.equal(request.headers['content-type'], 'text/x-tool-enc');
      assert.equal(request.headers.accountId, 'a');
      return { data: { d: { obsRootConfigId: mismatch ? 'other' : root, configs: [{ configType: 'noteConfig', jsonData: { annotationConfigs: [] } }] } } };
    } }; } };
  };
  pkg.keys = () => ['./http'];
  globalThis.location = { origin: 'https://www.kujiale.com', pathname: '/pub/saas/workbench/construction/drawing_config/config/comment', href: 'https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/config/comment' };
  globalThis.document = { querySelector: () => ({ textContent: 'test' }) };
  globalThis.performance = { getEntriesByType: () => [{ name: 'https://www.kujiale.com/dcs-drawing/site/api/open/config/full/get?obsRootConfigId=' + root }] };
  globalThis.window = { g_sessionAccount: { obsAccountId: 'a', obsUserId: 'u', obsRootAccount: { obsAccountId: 'r' } }, pubCmnPackages: { '@qunhe/tools-common': pkg } };
  try {
    const result = await readEncryptedConfig(); assert.equal(result.configurationParsed, true);
    assert.deepEqual(result.configs[0].jsonDataKeys, ['annotationConfigs']);
    assert.equal(result.saved, false); assert.equal(result.basicConfigOwnershipVerified, false);
    mismatch = true; assert.equal((await readEncryptedConfig()).configurationParsed, false);
    assert.equal(requests, 2);
  } finally { for (const [k, value] of Object.entries(previous)) globalThis[k] = value; }
});
