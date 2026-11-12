import { workflowInstructions } from './workflow.mjs';
import { tools, validateCall } from './tools.mjs';

export const versions = ['2025-03-26', '2025-06-18', '2025-11-25'];

export function createProtocol(broker) {
  return async function dispatch(request) {
    const fail = (code, message) => ({ jsonrpc: '2.0', id: request?.id ?? null, error: { code, message } });
    if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string' ||
        (request.id !== undefined && typeof request.id !== 'string' && typeof request.id !== 'number')) return fail(-32600, 'Invalid Request');
    if (request.id === undefined) return null;
    try {
      let result;
      switch (request.method) {
        case 'initialize':
          result = {
            protocolVersion: versions.includes(request.params?.protocolVersion) ? request.params.protocolVersion : versions.at(-1),
            capabilities: { tools: {} },
            serverInfo: { name: 'construction-drawing-readonly', version: '0.6.0' },
            instructions: workflowInstructions
          };
          break;
        case 'ping':
          result = {};
          break;
        case 'tools/list':
          result = { tools: tools.map(tool => ({ ...tool, annotations: tool.annotations || { readOnlyHint: true, openWorldHint: true } })) };
          break;
        case 'tools/call': {
          let args;
          try { args = validateCall(request.params?.name, request.params?.arguments); }
          catch (error) { return fail(-32602, error.message); }
          try {
            const name = request.params.name;
            if (name === 'drawing_save_config' || name === 'drawing_publish_config') {
              const snapshot = await broker.page(args.pageId, 'config', {});
              const actualName = snapshot?.identity?.configName;
              const operation = name === 'drawing_save_config' ? 'save' : 'publish';
              const mismatch = snapshot?.role !== 'config' || actualName !== args.expectedConfigName;
              const status = mismatch ? 'target_mismatch' : 'adapter_not_verified';
              const detail = {
                operation, status, executed: false, saved: false, published: false,
                pageId: args.pageId, expectedConfigName: args.expectedConfigName,
                actualConfigName: actualName || null,
                message: mismatch ? '目标配置与当前页面不符，未执行操作。' :
                  '目标已核对，但该写入操作的接口、确认流程及成功回读尚未实测验证，未执行。',
                nextStep: mismatch ? '重新读取上下文并定位目标配置。' :
                  '在测试配置中核对该操作的实际请求及回读证据，再接通执行适配器。'
              };
              result = { isError: true, content: [{ type: 'text', text: JSON.stringify(detail) }] };
              break;
            }
            const value = name === 'drawing_get_context' ? await broker.context() :
              await broker.page(args.pageId, name === 'drawing_read_config' ? 'config' : 'styles', args);
            result = { content: [{ type: 'text', text: JSON.stringify(value) }] };
          } catch (error) {
            result = { isError: true, content: [{ type: 'text', text: error.message }] };
          }
          break;
        }
        default:
          return fail(-32601, 'Method not found');
      }
      return { jsonrpc: '2.0', id: request.id, result };
    } catch {
      return fail(-32603, 'Internal error');
    }
  };
}

