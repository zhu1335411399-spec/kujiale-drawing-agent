import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Broker } from './broker.mjs';
import { createProtocol } from './protocol.mjs';
import { ConnectionMonitor } from './monitor.mjs';
import { endpoint, ensureDaemon, readLines, maxBytes } from './ipc.mjs';

export async function startBridge({ address = endpoint, timeoutMs = 35000, idleMs = 60000 } = {}) {
  const broker = new Broker(timeoutMs);
  const dispatch = createProtocol(broker);
  const monitor = new ConnectionMonitor();
  const sockets = new Set();
  const owners = new Map();
  const server = net.createServer(socket => {
    sockets.add(socket);
    const identities = new Set();
    socket.on('error', () => {});
    socket.on('close', () => {
      sockets.delete(socket);
      for (const clientId of identities) {
        if (owners.get(clientId) !== socket) continue;
        owners.delete(clientId);
        monitor.remove(clientId);
        for (const task of [...broker.pending.values()]) if (task.clientId === clientId) task.reject(new Error('Browser disconnected'));
        broker.clients.delete(clientId);
      }
    });
    readLines(socket, async message => {
      let value, error;
      try {
        const input = message.input || {};
        switch (message.route) {
          case '/health': value = { service: 'construction-drawing-readonly', version: '0.6.0' }; break;
          case '/manager/status': value = { ...monitor.snapshot(), version: '0.6.0', unreportedClients: [...broker.clients.keys()].filter(id => !monitor.reports.has(id)).length }; break;
          case '/hello':
          case '/poll':
            if (broker.clients.get(input.clientId)?.instanceId !== input.instanceId) monitor.remove(input.clientId);
            broker.register(input.clientId, input.instanceId);
            owners.set(input.clientId, socket);
            identities.add(input.clientId);
            if (input.report) monitor.report(input.clientId, input.instanceId, input.report);
            value = message.route === '/poll' ? { task: broker.poll(input.clientId, input.instanceId) } : { ok: true };
            break;
          case '/result':
            if (!identities.has(input.clientId)) throw new Error('Browser identity not registered on this connection');
            broker.complete(input.clientId, input.id, input.value, input.error);
            value = { ok: true };
            break;
          case '/mcp':
            if (input.method === 'tools/call') monitor.toolCalled(input.params?.name || 'unknown');
            value = await dispatch(input); break;
          default: throw new Error('Unknown local operation');
        }
      } catch (failure) { error = failure.message; }
      let line = JSON.stringify({ id: message.id, value, error }) + '\n';
      if (Buffer.byteLength(line) > maxBytes) line = JSON.stringify({ id: message.id, error: 'Read response too large; narrow the query' }) + '\n';
      if (!socket.destroyed) socket.write(line);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(address, resolve);
  });
  if (process.platform !== 'win32') fs.chmodSync(address, 0o600);
  const idle = setInterval(() => { if (!sockets.size) void close(); }, idleMs);
  idle.unref();
  async function close() {
    clearInterval(idle);
    broker.close();
    for (const socket of sockets) socket.destroy();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
  return { server, broker, address, close };
}

export async function serveStdio(client) {
  process.stdin.setEncoding('utf8');
  let buffer = '';
  const pending = new Set();
  const output = value => { if (value) process.stdout.write(JSON.stringify(value) + '\n'); };
  const run = async line => {
    let request;
    try { request = JSON.parse(line); }
    catch { output({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
    try { output(await client.call('/mcp', request)); }
    catch (error) { if (request?.id !== undefined) output({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: error.message } }); }
  };
  for await (const chunk of process.stdin) {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      if (Buffer.byteLength(line) > maxBytes) throw new Error('MCP message too large');
      const task = run(line);
      pending.add(task);
      void task.finally(() => pending.delete(task));
    }
    if (Buffer.byteLength(buffer) > maxBytes) throw new Error('MCP message too large');
  }
  if (buffer.trim()) await run(buffer);
  await Promise.all(pending);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--daemon')) {
      const bridge = await startBridge();
      process.once('SIGTERM', () => void bridge.close());
      process.once('SIGINT', () => void bridge.close());
    } else {
      const client = await ensureDaemon();
      try { await serveStdio(client); } finally { client.close(); }
    }
  } catch (error) {
    if (error.code !== 'EADDRINUSE') { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
  }
}

