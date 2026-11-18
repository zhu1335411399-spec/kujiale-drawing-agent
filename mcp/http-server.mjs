import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Broker } from './broker.mjs';
import { createProtocol } from './protocol.mjs';

export async function startHttpBridge({ port = 8788 } = {}) {
  const broker = new Broker();
  const dispatch = createProtocol(broker);
  const extensionOrigin = 'chrome-extension://mmhlmlopkglijgfdgnlhfjbfibblendl';
  const server = http.createServer(async (req, res) => {
    const reply = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(value === undefined ? '' : JSON.stringify(value)); };
    // Localhost only. Reject browser requests from websites and DNS rebinding.
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '') || (req.headers.origin && req.headers.origin !== extensionOrigin)) return reply(403, { error: 'Forbidden origin or host' });
    if (req.headers.origin === extensionOrigin) {
      res.setHeader('Access-Control-Allow-Origin', extensionOrigin);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    }
    if (req.method === 'OPTIONS') return reply(204);
    if (req.method === 'GET' && req.url === '/healthz') return reply(200, { service: 'construction-drawing-http', version: '0.6.0', browsers: broker.clients.size });
    if (req.method !== 'POST' || !['/mcp', '/bridge'].includes(req.url)) return reply(405, { error: 'Method not allowed' });
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return reply(415, { error: 'JSON required' });
    try {
      let body = '';
      for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 262144) return reply(413, { error: 'Message too large' }); }
      const input = JSON.parse(body);
      if (req.url === '/mcp') {
        const result = await dispatch(input);
        return result === null ? reply(202) : reply(200, result);
      }
      if (input.route === '/poll') {
        broker.register(input.clientId, input.instanceId, input.report);
        return reply(200, { task: broker.poll(input.clientId, input.instanceId) });
      }
      if (input.route === '/result') {
        if (broker.clients.get(input.clientId)?.instanceId !== input.instanceId) throw new Error('Browser session mismatch');
        broker.complete(input.clientId, input.id, input.value, input.error);
        return reply(200, { ok: true });
      }
      return reply(400, { error: 'Unsupported bridge operation' });
    } catch (error) { return reply(400, { error: error.message }); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, broker, port: server.address().port, close: async () => { broker.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startHttpBridge().then(bridge => {
    console.log('Drawing MCP: http://127.0.0.1:8788/mcp');
    process.once('SIGINT', () => void bridge.close());
    process.once('SIGTERM', () => void bridge.close());
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
