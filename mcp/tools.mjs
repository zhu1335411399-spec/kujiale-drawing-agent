const writeTarget = {
  pageId: { type: 'string', minLength: 1, maxLength: 120 },
  expectedConfigName: { type: 'string', minLength: 1, maxLength: 200 }
};

export const tools = [
  {name:'drawing_search_line_styles',description:'在已打开线样式页使用网页搜索框搜索名称，并逐页读取结果；区别于当前页本地过滤。返回实际记录ID和原字段快照、已检查结果页数及complete。范围是网页搜索结果，不能据此宣称搜索了所有库；结果未查完整时禁止用于唯一定位。不修改样式或保存。',
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},
    inputSchema:{type:'object',additionalProperties:false,properties:{...writeTarget,expectedCustomerName:{type:'string',minLength:1,maxLength:200},query:{type:'string',minLength:0,maxLength:100},match:{type:'string',enum:['exact','contains'],maxLength:10},maxPages:{type:'integer',minimum:1,maximum:10}},required:['pageId','expectedConfigName','expectedCustomerName','query']}},
  {name:'drawing_update_line_style',description:'编辑明确选定的已有线样式。必须提供网页搜索返回的完整expectedStyle原值快照及唯一requestId，只修改changes中的字段。全量核对线样式分页及未修改记录；同名、原值变化、只读锁或范围未查完整时停止。CONTINUOUS不可设置比例。返回编辑回执receiptId，尚未保存；有引用的样式影响范围当前未知。失败可能留下部分修改，不盲目重复。',
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true},
    inputSchema:{type:'object',additionalProperties:false,properties:{...writeTarget,expectedCustomerName:{type:'string',minLength:1,maxLength:200},requestId:{type:'string',minLength:8,maxLength:100},expectedStyle:{type:'object',additionalProperties:false,properties:Object.fromEntries(['id','name','lineType','scale','color','widthMm'].map(k=>[k,{type:'string',maxLength:300}])),required:['id','name','lineType','scale','color','widthMm']},changes:{type:'object',additionalProperties:false,minProperties:1,properties:Object.fromEntries(['name','lineType','scale','colorIndex','widthMm'].map(k=>[k,{type:'string',minLength:1,maxLength:100}]))}},required:['pageId','expectedConfigName','expectedCustomerName','requestId','expectedStyle','changes']}},
  {name:'drawing_save_line_style',description:'独立保存已验证编辑回执对应的线样式变更。不新建、不发布。保存前核对线样式，精确核对客户确认框，观察新成功提示或保存时间更新后刷新回读。刷新回到操作员自己的配置时，仅重新载入原客户一次并核对原配置。必须使用同一页面的receiptId，已确认提交后只核验、不重复保存。回读不代表独立服务器API验证，不能保存其他分类。',
    annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:true},
    inputSchema:{type:'object',additionalProperties:false,properties:{...writeTarget,expectedCustomerName:{type:'string',minLength:1,maxLength:200},receiptId:{type:'string',minLength:8,maxLength:100}},required:['pageId','expectedConfigName','expectedCustomerName','receiptId']}},
  {name:'drawing_read_frontend_identity',description:'只读检查指定浏览器设计页右上角头像。先 inspect 返回实际头像候选，再用返回的 avatarKey 执行 hover，读取头像标题、提示或账号菜单中的名称及可见账号ID。expectedBrowser 必须与实际浏览器匹配。账号ID没有证据时为null，不从名称推断后台客户ID，不核验企业归属、模板或配置已生效。不点击、切换账号、保存、发布；未知或多个名称保持未确认。',
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},
    inputSchema:{type:'object',additionalProperties:false,properties:{pageId:{type:'string',minLength:1,maxLength:120},action:{type:'string',enum:['inspect','hover'],maxLength:10},expectedBrowser:{type:'string',enum:['Chrome','Edge'],maxLength:10},expectedCompanyName:{type:'string',minLength:1,maxLength:200},frameId:{type:'integer',minimum:0,maximum:2147483647,description:'inspect 返回的目标头像所在 frameId，默认主页面0'},avatarKey:{type:'string',minLength:1,maxLength:5000}},required:['pageId','action','expectedBrowser','expectedCompanyName']}},
  {name:'drawing_load_customer_config',description:'通用载入客户施工图配置。customerName 可为当前登录账号有权访问的任意主账号显示名称；同名时用 inspect 返回的 customerLabel 完整标签区分。先用 drawing_get_context 获取 pageId 和 configStatusText 作为 expectedStatus。inspect 只检查候选项，load 选择唯一匹配账号并点击载入，再回读来源标签和侧边模板；不切换登录账号，不强制指定模板，不保存或发布。已记录但未确认保存的草稿会阻止切换；不能据此检测所有手动未保存修改。loaded 仅表示来源显示标签核验，identityVerified=false；结果不确定时禁止自动重试。',
    annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:true},
    inputSchema:{type:'object',additionalProperties:false,properties:{pageId:{type:'string',minLength:1,maxLength:120},customerName:{type:'string',minLength:1,maxLength:200,description:'目标主账号的准确显示名称，不是当前登录操作员名称'},customerLabel:{type:'string',minLength:1,maxLength:400,description:'可选；inspect 返回的完整候选标签，用于区分同名账号，不自行猜测'},expectedStatus:{type:'string',minLength:1,maxLength:300,description:'最近一次 drawing_get_context 返回的当前配置 configStatusText'},mode:{type:'string',enum:['inspect','load'],maxLength:10}},required:['pageId','customerName','expectedStatus','mode']}},
  { name: 'drawing_create_line_draft', description: '通用新建线样式草稿：在已打开的线样式页创建一行，按参数设置名称、线型、CAD颜色索引、线宽，再回读所有字段。复用网页操作，无须网站HTTP接口。线型比例保留网页默认值。不会保存、发布或刷新。先用 drawing_get_context 核对 pageId、配置名称和来自于标签。重名检查仅覆盖当前网页分页；失败可能留下部分修改。requestId 每项新任务唯一，恢复同一任务时不得改变参数。成功返回 status=draft-fields-verified、style 和 saved=false。',
    annotations: { readOnlyHint:false, destructiveHint:false, idempotentHint:false, openWorldHint:true },
    inputSchema: {type:'object',additionalProperties:false,
      properties: {
        pageId:{type:'string',minLength:1,maxLength:120,description:'drawing_get_context 返回的目标配置页面标识'},
        requestId:{type:'string',minLength:8,maxLength:100,description:'本次任务唯一ID，限英文字母、数字、下划线及连字符；恢复本次任务必须用相同参数'},
        expectedConfigName:{type:'string',minLength:1,maxLength:200,description:'当前选中的基础配置名称，必须精确匹配'},
        expectedCustomerName:{type:'string',minLength:1,maxLength:200,description:'右上角来自于后的完整显示标签，例如客户名称或你的账号；不能当作真实账号ID'},
        name:{type:'string',minLength:1,maxLength:100,description:'新线样式名称'},
        lineType:{type:'string',minLength:1,maxLength:100,description:'网页下拉选项中的准确名称，例如CONTINUOUS、DOT、DASHED；未找到对应选项时停止'},
        colorIndex:{type:'string',minLength:1,maxLength:3,description:'CAD颜色索引0至255，例如255；不接受RGB字符串'},
        widthMm:{type:'string',minLength:1,maxLength:20,description:'网页线宽下拉选项中的毫米数值，例如0.09、0.13；未找到对应选项时停止'}
      },
      required:['pageId','requestId','expectedConfigName','expectedCustomerName','name','lineType','colorIndex','widthMm']} },
  { name: 'drawing_new_line_style', description: 'Click New Style once on the current line-style page and return its generated name. Does not edit or save. Reuse requestId after uncertain outcomes.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: { type: 'object', additionalProperties: false,
      properties: Object.fromEntries(['pageId','requestId','expectedStatus'].map(k => [k,{ type:'string',minLength:1,maxLength:300 }])),
      required: ['pageId','requestId','expectedStatus'] } },
  { name: 'drawing_capture_api', description: 'Start/stop/read bounded passive network capture. Records survive page refresh and worker restart in extension session storage; browser restart or extension reload clears them. Requires debugger permission; opening DevTools may detach. Never replays; encoded responses remain unparsed.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: { type: 'object', additionalProperties: false, properties: {
      pageId: { type: 'string', minLength: 1, maxLength: 120 }, action: { type: 'string', enum: ['start', 'stop', 'read', 'clear'], maxLength: 10 }
    }, required: ['pageId', 'action'] } },
  {
    name: 'drawing_create_line_style_and_save',
    description: 'Create one line style, set all five fields, save and reload to verify. DOM adapter, not a verified HTTP API. Requires loaded customer and all rows on page 1. Never publishes. Do not repeat an uncertain request.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: { type: 'object', additionalProperties: false,
      properties: Object.fromEntries(['pageId', 'requestId', 'expectedConfigName', 'expectedCustomerName', 'name', 'lineType', 'scale', 'colorIndex', 'widthMm'].map(key => [key, { type: 'string', minLength: 1, maxLength: 200 }])),
      required: ['pageId', 'requestId', 'expectedConfigName', 'expectedCustomerName', 'name', 'lineType', 'scale', 'colorIndex', 'widthMm'] }
  },
  {
    name: 'drawing_read_api',
    description: 'Read a fixed drawing API resource using the selected browser login. observed-requests lists current resource paths/query keys only; templates requests the template list. Business response structure is not yet live verified. No arbitrary URL, save or publish.',
    annotations: { readOnlyHint: true, openWorldHint: true },
    inputSchema: { type: 'object', additionalProperties: false,
      properties: { pageId: { type: 'string', minLength: 1, maxLength: 120 }, resource: { type: 'string', enum: ['observed-requests', 'templates', 'full-config'], maxLength: 30 } },
      required: ['pageId', 'resource'] }
  },
  {
    name: 'drawing_create_line_style',
    description: '仅在用户指定的 MCP样式引用 测试配置中创建一个 MCP_TEST_ 命名的测试线样式，保留页面默认属性，尝试保存并重载回读。不激活、不发布。失败可能已有新建或未保存修改，不得盲目重试。当前适配器待真实页面验收。',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: { type: 'object', additionalProperties: false,
      properties: { pageId: { type: 'string', minLength: 1, maxLength: 120 },
        expectedConfigName: { type: 'string', minLength: 1, maxLength: 100 },
        expectedCustomerName: { type: 'string', minLength: 1, maxLength: 200 },
        name: { type: 'string', minLength: 10, maxLength: 89 } },
      required: ['pageId', 'expectedConfigName', 'expectedCustomerName', 'name'] }
  },
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
  if(name==='drawing_update_line_style'){
    if(!/^[A-Za-z0-9_-]{8,100}$/.test(value.requestId||''))throw Error('Invalid edit request ID');
    const style=value.expectedStyle,patch=value.changes;
    if(!style||typeof style!=='object'||Array.isArray(style)||Object.keys(style).sort().join(',')!=='color,id,lineType,name,scale,widthMm'||Object.values(style).some(v=>typeof v!=='string'||v.length>300)||!style.id||!style.name)throw Error('Complete original style snapshot required');
    if(!patch||typeof patch!=='object'||Array.isArray(patch)||!Object.keys(patch).length||Object.keys(patch).some(k=>!['name','lineType','scale','colorIndex','widthMm'].includes(k))||Object.values(patch).some(v=>typeof v!=='string'||!v.trim()||v.length>100))throw Error('Explicit supported style changes required');
    if(patch.lineType!==undefined&&!/^[A-Z0-9_]+$/.test(patch.lineType))throw Error('Invalid line type');
    if(patch.colorIndex!==undefined&&(!/^\d+$/.test(patch.colorIndex)||Number(patch.colorIndex)>255))throw Error('Invalid color index');
    for(const k of ['scale','widthMm'])if(patch[k]!==undefined&&(!/^\d+(\.\d+)?$/.test(patch[k])||Number(patch[k])<=0))throw Error('Invalid '+k);
  }
  if(name==='drawing_save_line_style'&&!/^[A-Za-z0-9_-]{8,100}$/.test(value.receiptId||''))throw Error('Invalid edit receipt ID');
  if (name === 'drawing_read_frontend_identity' && value.action === 'hover' && !value.avatarKey) throw new Error('Inspect and select avatarKey before hover');
  if (name === 'drawing_create_line_draft' && (!/^[A-Za-z0-9_-]{8,100}$/.test(value.requestId || '') ||
      !value.name?.trim() || !/^[A-Z0-9_]+$/.test(value.lineType || '') ||
      !/^\d+$/.test(value.colorIndex || '') || Number(value.colorIndex) > 255 ||
      !/^\d+(\.\d+)?$/.test(value.widthMm || '') || Number(value.widthMm) <= 0)) throw new Error('Invalid line-style draft parameters');
  if (name === 'drawing_create_line_style' && (!value.expectedConfigName?.startsWith('MCP样式引用') || !/^MCP_TEST_[A-Za-z0-9_-]{1,80}$/.test(value.name || ''))) throw new Error('Only an explicitly named test configuration and MCP_TEST_ style may be created');
  for (const key of Object.keys(value)) if (!(key in schema.properties)) throw new Error('Unknown argument: ' + key);
  for (const key of schema.required || []) if (!(key in value)) throw new Error('Missing argument: ' + key);
  for (const [key, field] of Object.entries(schema.properties)) {
    const input = value[key];
    if (input === undefined) continue;
    if (field.enum && !field.enum.includes(input)) throw new Error('Invalid argument: ' + key);
    if (field.type === 'string' && (typeof input !== 'string' || input.length < (field.minLength || 0) || input.length > field.maxLength)) throw new Error('Invalid argument: ' + key);
    if (field.type === 'integer' && (!Number.isInteger(input) || input < field.minimum || input > field.maximum)) throw new Error('Invalid argument: ' + key);
  }
  return { ...value };
}

