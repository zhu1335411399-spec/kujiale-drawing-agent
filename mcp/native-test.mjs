import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startBridge } from './native-server.mjs';
import { connect, ensureDaemon } from './ipc.mjs';
import { readFrames, writeFrame, extensionId } from './native-host.mjs';

const address = process.platform === 'win32' ? '\\\\.\\pipe\\drawing-test-' + randomUUID() : path.join(os.tmpdir(), randomUUID() + '.sock');
const bridge = await startBridge({ address, timeoutMs: 100 });
const agent = await connect(address), browser = await connect(address), browser2 = await connect(address);
const rpc = (name, args = {}) => agent.call('/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
try {
  const initialized = await agent.call('/mcp', { jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-03-26' } });
  assert.equal(initialized.result.serverInfo.version, '0.6.0');
  const tools = (await agent.call('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list' })).result.tools;
  assert.equal(tools.length, 5);
  assert.ok(tools.slice(0, 3).every(tool => tool.annotations.readOnlyHint));
  assert.ok(tools.slice(3).every(tool => tool.annotations.readOnlyHint === false));
  assert.equal((await rpc('drawing_get_context')).result.isError, true);
  assert.equal((await rpc('drawing_read_config')).error.code, -32602);
  const clientId = randomUUID(), otherId = randomUUID(), instanceId = randomUUID();
  await browser.call('/hello', { clientId, instanceId });
  await browser2.call('/hello', { clientId: otherId, instanceId });
  const context = rpc('drawing_get_context');
  // Same tab ID in separate browser profiles must still yield distinct page IDs.
  for (const [connection, id, role] of [[browser, clientId, 'config'], [browser2, otherId, 'design']]) {
    const { task } = await connection.call('/poll', { clientId: id, instanceId });
    assert.equal(task.operation, 'context');
    await connection.call('/result', { clientId: id, id: task.id, value: [{ tabId: 7, role }] });
  }
  const pages = JSON.parse((await context).result.content[0].text).browsers.flatMap(item => item.pages);
  assert.equal(new Set(pages.map(page => page.pageId)).size, 2);
  const read = rpc('drawing_read_config', { pageId: clientId + ':7' });
  const { task } = await browser.call('/poll', { clientId, instanceId });
  assert.equal(task.args.tabId, 7);
  await assert.rejects(browser2.call('/result', { clientId, id: task.id, value: {} }), /not registered/);
  await browser.call('/result', { clientId, id: task.id, value: { configName: 'example' } });
  assert.equal(JSON.parse((await read).result.content[0].text).configName, 'example');
  for (const name of ['drawing_save_config', 'drawing_publish_config']) {
    assert.equal((await rpc(name, { pageId: clientId + ':7' })).error.code, -32602);
    for (const actualName of ['example', 'different']) {
      const call = rpc(name, { pageId: clientId + ':7', expectedConfigName: 'example' });
      const { task: writeProbe } = await browser.call('/poll', { clientId, instanceId });
      assert.equal(writeProbe.operation, 'config', 'Unverified adapters must only read');
      await browser.call('/result', { clientId, id: writeProbe.id, value: { role: 'config', identity: { configName: actualName } } });
      const reply = await call;
      assert.equal(reply.result.isError, true);
      const detail = JSON.parse(reply.result.content[0].text);
      assert.equal(detail.executed, false);
      assert.equal(detail.status, actualName === 'example' ? 'adapter_not_verified' : 'target_mismatch');
    }
  }
  console.log('PASS separate save/publish tools: write annotations, target checks, no unverified write execution');
  const timedOut = await rpc('drawing_read_config', { pageId: clientId + ':7' });
  assert.equal(timedOut.result.isError, true);
  const disconnectRead = rpc('drawing_read_config', { pageId: clientId + ':7' });
  await browser.call('/poll', { clientId, instanceId });
  browser.close();
  assert.match((await disconnectRead).result.content[0].text, /disconnected/);
  console.log('PASS IPC: initialize, validation, dual profiles, cross-profile isolation, readback, timeout, disconnect');
} finally {
  agent.close(); browser.close(); browser2.close(); await bridge.close();
}

// Chrome native messaging framing: split headers, UTF-8 and multiple messages.
const wire = new PassThrough(), frames = [], failures = [];
readFrames(wire, value => frames.push(value), error => failures.push(error));
const capture = new PassThrough(), chunks = [];
capture.on('data', chunk => chunks.push(chunk));
writeFrame(capture, { label: '\u65bd\u5de5\u56fe' });
writeFrame(capture, { id: 2 });
const encoded = Buffer.concat(chunks);
wire.write(encoded.subarray(0, 2)); wire.write(encoded.subarray(2, 9)); wire.write(encoded.subarray(9));
assert.deepEqual(frames, [{ label: '\u65bd\u5de5\u56fe' }, { id: 2 }]);
assert.equal(failures.length, 0);
const oversized = Buffer.alloc(4); oversized.writeUInt32LE(262145); wire.write(oversized);
assert.equal(failures.length, 1);
console.log('PASS native frames: partial headers, UTF-8, coalesced messages, size limit');

const manifest = JSON.parse(fs.readFileSync(new URL('../browser-extension/manifest.json', import.meta.url), 'utf8'));
const origin = 'chrome-extension://' + extensionId(manifest.key) + '/';
assert.match(origin, /^chrome-extension:\/\/[a-p]{32}\/$/);
assert.ok(manifest.permissions.includes('nativeMessaging'));
assert.ok(!manifest.host_permissions.some(value => value.startsWith('http:')));
const hostFile = fileURLToPath(new URL('./native-host.mjs', import.meta.url));
const host = spawn(process.execPath, [hostFile, origin], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '';
host.stderr.on('data', chunk => { stderr += chunk; });
let next = 0;
const waiting = new Map();
readFrames(host.stdout, message => {
  const task = waiting.get(message.id);
  if (!task) return;
  clearTimeout(task.timer); waiting.delete(message.id);
  message.error ? task.reject(new Error(message.error)) : task.resolve(message.value);
}, error => { throw error; });
function nativeCall(route, input) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => { waiting.delete(id); reject(new Error('Native host timeout: ' + stderr)); }, 8000);
    waiting.set(id, { resolve, reject, timer });
    writeFrame(host.stdin, { id, route, input });
  });
}
let shared;
try {
  const clientId = randomUUID(), instanceId = randomUUID();
  assert.equal((await nativeCall('/hello', { clientId, instanceId })).ok, true);
  assert.equal((await nativeCall('/poll', { clientId, instanceId })).task, null);
  await assert.rejects(nativeCall('/mcp', {}), /Unsupported/);
  shared = await ensureDaemon();
  assert.equal((await shared.call('/health')).version, '0.6.0');
  const context = shared.call('/mcp', { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'drawing_get_context', arguments: {} } });
  const { task } = await nativeCall('/poll', { clientId, instanceId });
  assert.equal(task.operation, 'context');
  await nativeCall('/result', { clientId, id: task.id, value: [{ tabId: 12, role: 'config' }] });
  assert.equal(JSON.parse((await context).result.content[0].text).browsers[0].pages[0].pageId, clientId + ':12');
  console.log('PASS native host process: origin, daemon auto-start, browser whitelist, MCP-to-host round trip');
} finally { shared?.close(); host.stdin.end(); host.kill(); }

const invalidHost = spawn(process.execPath, [hostFile, 'chrome-extension://' + 'a'.repeat(32) + '/'], { windowsHide: true, stdio: 'ignore' });
assert.equal(await new Promise(resolve => invalidHost.once('exit', resolve)), 1);
console.log('PASS rejected unregistered origin');

