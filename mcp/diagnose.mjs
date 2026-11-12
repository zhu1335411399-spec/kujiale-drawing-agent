import { ensureDaemon } from './ipc.mjs';
const client = await ensureDaemon();
try {
  const health = await client.call('/health');
  const reply = await client.call('/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/list' });
  if (reply.error || !Array.isArray(reply.result?.tools) || reply.result.tools.length !== 5) throw new Error('MCP tool inventory failed');
  console.log(JSON.stringify({
    version: health.version, localBridge: 'ready', mcpProtocol: 'ready',
    browserConnection: 'not-verified', aiClientConnection: 'not-verified',
    tools: reply.result.tools.map(tool => ({ name: tool.name, readOnly: tool.annotations.readOnlyHint })),
    savePublishExecution: 'adapter-not-verified', frontendActions: 'not-implemented'
  }));
} finally { client.close(); }

