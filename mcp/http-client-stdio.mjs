import { serveStdio } from './native-server.mjs';
// Standard STDIO entry for hosts that do not accept Streamable HTTP URLs.
await serveStdio({ async call(route, input) {
  if (route !== '/mcp') throw new Error('Unsupported route');
  const response = await fetch('http://127.0.0.1:8788/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error('Local HTTP MCP returned ' + response.status);
  return response.status === 202 ? null : response.json();
} });
