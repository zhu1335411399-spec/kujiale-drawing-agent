const writeTarget = {
  pageId: { type: 'string', minLength: 1, maxLength: 120 },
  expectedConfigName: { type: 'string', minLength: 1, maxLength: 200 }
};

export const tools = [
  {
    name: 'drawing_get_context',
    description: '只读列出已连接浏览器配置页与设计页，返回页面标识、显示名称、已选基础配置及来源证据。多个配置页时必须选定 pageId。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'drawing_read_config',
    description: '只读目标配置页当前显示的基础配置名称、状态、来源文字和账号显示标签。未知客户归属保持待确认。',
    inputSchema: {
      type: 'object', properties: { pageId: { type: 'string', minLength: 1, maxLength: 120 } },
      required: ['pageId'], additionalProperties: false
    }
  },
  {
    name: 'drawing_list_line_styles',
    description: '只读目标配置页当前线样式表，可按名称过滤并分页返回。需先在目标页打开样式配置的线样式标签。本工具不会切换页面或翻动网页分页。',
    inputSchema: {
      type: 'object', properties: {
        pageId: { type: 'string', minLength: 1, maxLength: 120 },
        name: { type: 'string', maxLength: 100 },
        offset: { type: 'integer', minimum: 0, maximum: 10000, default: 0 },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
      },
      required: ['pageId'], additionalProperties: false
    }
  },
  {
    name: 'drawing_save_config',
    description: '保存当前配置，不发布。每次配置修改完成后必须调用并确认保存成功，才能报告配置完成。当前保存适配器尚未实测验证，调用会返回明确的未执行状态。',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: 'object', properties: writeTarget,
      required: ['pageId', 'expectedConfigName'], additionalProperties: false
    }
  },
  {
    name: 'drawing_publish_config',
    description: '单独发布已保存的配置。仅在用户明确要求发布时调用；不能作为保存的后续自动步骤。当前发布适配器尚未实测验证，调用会返回明确的未执行状态。',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    inputSchema: {
      type: 'object', properties: writeTarget,
      required: ['pageId', 'expectedConfigName'], additionalProperties: false
    }
  }
];

export function validateCall(name, value = {}) {
  const tool = tools.find(item => item.name === name);
  if (!tool) throw new Error('Unknown tool');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Arguments must be an object');
  const schema = tool.inputSchema;
  for (const key of Object.keys(value)) if (!(key in schema.properties)) throw new Error('Unknown argument: ' + key);
  for (const key of schema.required || []) if (!(key in value)) throw new Error('Missing argument: ' + key);
  for (const [key, field] of Object.entries(schema.properties)) {
    const input = value[key];
    if (input === undefined) continue;
    if (field.type === 'string' && (typeof input !== 'string' || input.length < (field.minLength || 0) || input.length > field.maxLength)) throw new Error('Invalid argument: ' + key);
    if (field.type === 'integer' && (!Number.isInteger(input) || input < field.minimum || input > field.maximum)) throw new Error('Invalid argument: ' + key);
  }
  return { ...value };
}

