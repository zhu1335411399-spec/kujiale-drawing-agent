const writeTarget = {
  pageId: { type: 'string', minLength: 1, maxLength: 120 },
  expectedConfigName: { type: 'string', minLength: 1, maxLength: 200 }
};
const annotationTarget={...writeTarget,expectedCustomerName:{type:'string',minLength:1,maxLength:200},annotationKind:{type:'string',enum:['text','leader','dimension','elevation']}};
const objectTarget={...writeTarget,expectedStatus:{type:'string',minLength:1,maxLength:300},expectedCustomerName:{type:'string',minLength:1,maxLength:200},majorCategory:{type:'string',minLength:1,maxLength:200},rowId:{type:'string',minLength:1,maxLength:200},trueCategory:{type:'string',minLength:1,maxLength:200}};
const objectPropertySchema=(snapshot)=>({type:'object',additionalProperties:false,minProperties:1,properties:Object.fromEntries(['selectable','sectionMode','hideSideElevation'].map(k=>[k,{type:'object',additionalProperties:false,properties:{mode:{type:'string',enum:snapshot?['custom','parent','unmarked']:['custom','parent']},value:k==='sectionMode'?{type:'string',enum:[...(snapshot?['请选择']:[]),'剖到显示截面','剖到显示整体','剖到不显示']}:{type:'boolean'}},required:snapshot?['mode','value']:['mode']} ])),...(snapshot?{required:['selectable','sectionMode','hideSideElevation']}:{})});

export const tools = [
  {name:'drawing_sync_frontend_configuration',description:'检查当前企业模板后，在同一设计文档中关闭模板查看框并执行设置/更新配置。action=inspect只读模板，update首次提交，confirm只处理已观察且无额外覆盖说明的确认框，verify只回读。任务绑定账号显示证据、浏览器、方案标题和模板；历史账号证据明确标记。结果不明不重放点击，不切换模板、不全部重生成、不保存或发布；配置更新不代表图纸效果已验证。',annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{pageId:{type:'string',minLength:1,maxLength:120},expectedBrowser:{type:'string',enum:['Chrome','Edge']},expectedCompanyName:{type:'string',minLength:1,maxLength:200},expectedTitle:{type:'string',minLength:1,maxLength:200},expectedTemplateName:{type:'string',minLength:1,maxLength:200},requestId:{type:'string',minLength:8,maxLength:100},action:{type:'string',enum:['inspect','update','confirm','verify']}},required:['pageId','expectedBrowser','expectedCompanyName','expectedTitle','expectedTemplateName','requestId','action']}},
  {name:'drawing_frontend_navigation',description:'按同一文档的已读账号、当前标题及可见控件打开图纸&清单菜单、施工图工作区或设置菜单；已打开时不重复点击。返回实际打开状态，历史账号证据标记stale，仅供导航。不能选择模板、更新配置、生成、保存或发布；网站进入工作区时可能自动布局。结果未确认时先检查页面，不自动重试。',annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{pageId:{type:'string',minLength:1,maxLength:120},expectedBrowser:{type:'string',enum:['Chrome','Edge']},expectedCompanyName:{type:'string',minLength:1,maxLength:200},expectedTitle:{type:'string',minLength:1,maxLength:200},action:{type:'string',enum:['open-drawing-menu','open-drawing-workspace','open-settings']}},required:['pageId','expectedBrowser','expectedCompanyName','expectedTitle','action']}},
  {name:'drawing_read_frontend_account',description:'只读设计端账号及施工图打开状态，普通设计端也可检测。与扩展弹窗/侧栏共享缓存和在途请求；默认同一文档自动检测一次，不循环重试。refresh=true只用于明确重测。返回cached/stale及未确认原因，模板、更新配置和实际效果独立核验。名称匹配不证明真实企业归属。',annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{pageId:{type:'string',minLength:1,maxLength:120},expectedBrowser:{type:'string',enum:['Chrome','Edge']},expectedCompanyName:{type:'string',minLength:1,maxLength:200},refresh:{type:'boolean',default:false}},required:['pageId','expectedBrowser','expectedCompanyName']}},
  {name:'drawing_update_object_properties',description:'按准确大类、真分类ID和原值快照修改对象可选择性(selectable)、剖切方式(sectionMode)或立面侧面隐藏(hideSideElevation)；各字段明确随上级(parent)/自定义(custom)。只改指定字段，回读原ID并返回receiptId。结果不明先检查；不保存发布。',annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{...objectTarget,requestId:{type:'string',minLength:8,maxLength:100},expectedProperties:objectPropertySchema(true),changes:objectPropertySchema(false)},required:[...Object.keys(objectTarget),'requestId','expectedProperties','changes']}},
  {name:'drawing_replace_object_line_style',description:'在已观察的对象显示样式中替换一个可直接替换的造型线、轮廓线或截面线。明确浅/深底、原单元格和目标线样式名称；完整遍历替换栏分页验证唯一记录，返回回执。不修改共享线样式本身，不适用于填充，不新建、不保存发布。',annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{...objectTarget,requestId:{type:'string',minLength:8,maxLength:100},theme:{type:'string',enum:['light','dark']},styleField:{type:'string',enum:['modelingLine','outlineLine','sectionLine']},expectedCellText:{type:'string',minLength:1,maxLength:300},replacementName:{type:'string',minLength:1,maxLength:100}},required:[...Object.keys(objectTarget),'requestId','theme','styleField','expectedCellText','replacementName']}},
  {name:'drawing_save_object_config',description:'独立保存本轮对象修改回执；核对客户确认框和保存时间，刷新、重载原客户，重新按大类、原ID和字段回读。已提交后仅核验，不重复保存。配置级保存不排除其他分类手工修改，不发布，不证明前端生效。',annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{...writeTarget,expectedStatus:{type:'string',minLength:1,maxLength:300},expectedCustomerName:{type:'string',minLength:1,maxLength:200},receiptIds:{type:'array',minItems:1,maxItems:20,items:{type:'string'}}},required:['pageId','expectedConfigName','expectedStatus','expectedCustomerName','receiptIds']}},
  {name:'drawing_inspect_frontend_drawing',description:'只读已连接设计页当前可见图纸入口、模板文字和控件结构；不点击、更新配置、生成或保存。模板类型和账号没有明确证据时保持未知。',annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{pageId:{type:'string',minLength:1,maxLength:120},expectedBrowser:{type:'string',enum:['Chrome','Edge']},expectedCompanyName:{type:'string',minLength:1,maxLength:200}},required:['pageId','expectedBrowser','expectedCompanyName']}},
  {name:'drawing_inspect_object_config',description:'只读对象配置的大类、真分类、属性与显示样式控件。可切换对象属性/显示样式，展开并选择已观察大类；不改值、不保存发布。只覆盖当前渲染结果，不能把大类或控件可见当作完整支持。',annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{pageId:{type:'string',minLength:1,maxLength:120},expectedStatus:{type:'string',minLength:1,maxLength:300},expectedCustomerName:{type:'string',minLength:1,maxLength:200},expectedConfigName:{type:'string',minLength:1,maxLength:200},action:{type:'string',enum:['inspect','open-object','select-section','open-category-list','select-category','scan-categories','open-property-menu','open-section-options','expand-category','open-style-picker','close-picker','scan-style-candidates','read-properties','search-true-category']},section:{type:'string',enum:['properties','display']},controlKey:{type:'string',maxLength:30},expectedValue:{type:'string',maxLength:200},majorCategory:{type:'string',maxLength:200},rowId:{type:'string',maxLength:200},trueCategory:{type:'string',maxLength:200},property:{type:'string',enum:['selectable','sectionMode','hideSideElevation']},styleField:{type:'string',maxLength:50},query:{type:'string',maxLength:100}},required:['pageId','expectedStatus','expectedCustomerName','action']}},
  {name:'drawing_search_annotation_styles',description:'在指定注释分类中实际搜索样式名称，回读行ID和名称及当前结果完整性。不修改或保存。',annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{...annotationTarget,query:{type:'string',minLength:0,maxLength:100},match:{type:'string',enum:['exact','contains']}},required:['pageId','expectedConfigName','expectedCustomerName','annotationKind','query']}},
  {name:'drawing_create_annotation_style',description:'在明确客户和分类中新建一个注释测试/业务样式，保留规范默认值，设置指定名称并按新ID回读。只创建草稿，返回receiptId；结果不明禁止重复新建。',annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{...annotationTarget,name:{type:'string',minLength:1,maxLength:50},requestId:{type:'string',minLength:8,maxLength:100}},required:['pageId','expectedConfigName','expectedCustomerName','annotationKind','name','requestId']}},
  {name:'drawing_update_annotation_style',description:'通过原ID与名称快照修改指定注释样式。支持保留ID改名；文本分类可修改fontSize并重新打开面板核对其他字段未变化。其他规范字段不支持。不保存发布，返回编辑回执；失败先核对实际结果。',annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{...annotationTarget,requestId:{type:'string',minLength:8,maxLength:100},expectedStyle:{type:'object',additionalProperties:false,properties:{id:{type:'string'},name:{type:'string'}},required:['id','name']},changes:{type:'object',additionalProperties:false,minProperties:1,properties:{name:{type:'string',minLength:1,maxLength:100},fontSize:{type:'string',minLength:1,maxLength:20}}}},required:['pageId','expectedConfigName','expectedCustomerName','annotationKind','requestId','expectedStyle','changes']}},
  {name:'drawing_save_annotation_styles',description:'独立保存同一页面多个注释编辑回执。先核对各分类列表和客户确认框，保存时间更新后刷新，重新载入原客户并按同一ID回读。确认已提交后不重复保存；不发布。独立服务器API未验证。',annotations:{readOnlyHint:false,destructiveHint:true,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{...writeTarget,expectedCustomerName:{type:'string',minLength:1,maxLength:200},receiptIds:{type:'array',minItems:1,maxItems:20,items:{type:'string',minLength:8,maxLength:100}}},required:['pageId','expectedConfigName','expectedCustomerName','receiptIds']}},
  {name:'drawing_inspect_style_settings',description:'只读查看样式配置的注释样式或通用设置。可切换已观察的子标签、按实际行ID打开编辑面板查看字段，再取消关闭；不新建、不改名称或任何值、不保存发布。返回当前可见字段，不能宣称完整分类已支持编辑。',annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{...writeTarget,expectedCustomerName:{type:'string',minLength:1,maxLength:200},section:{type:'string',enum:['annotation','general']},action:{type:'string',enum:['inspect','open-editor','close-editor']},annotationKind:{type:'string',enum:['text','leader','dimension','elevation']},styleId:{type:'string',minLength:1,maxLength:120},limit:{type:'integer',minimum:1,maximum:50}},required:['pageId','expectedConfigName','expectedCustomerName','section','action']}},
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
  if(name==='drawing_read_frontend_account'&&value.refresh!==undefined&&typeof value.refresh!=='boolean')throw Error('refresh must be boolean');
  if(['drawing_update_object_properties','drawing_replace_object_line_style'].includes(name)&&!/^[A-Za-z0-9_-]{8,100}$/.test(value.requestId||''))throw Error('Invalid object request ID');
  if(name==='drawing_update_object_properties'){
    const keys=['selectable','sectionMode','hideSideElevation'];
    for(const [label,p] of [['expectedProperties',value.expectedProperties],['changes',value.changes]]){
      if(!p||typeof p!=='object'||Array.isArray(p)||!Object.keys(p).length||Object.keys(p).some(k=>!keys.includes(k))||(label==='expectedProperties'&&Object.keys(p).length!==3))throw Error('Complete observed object properties and explicit changes required');
      for(const [k,v] of Object.entries(p)){if(!v||typeof v!=='object'||Array.isArray(v)||!(label==='expectedProperties'?['custom','parent','unmarked']:['custom','parent']).includes(v.mode)||Object.keys(v).some(q=>!['mode','value'].includes(q)))throw Error('Explicit object inheritance mode required');if(v.mode==='custom'||label==='expectedProperties'){if(k==='sectionMode'?(typeof v.value!=='string'||!(label==='expectedProperties'?['请选择','剖到显示截面','剖到显示整体','剖到不显示']:['剖到显示截面','剖到显示整体','剖到不显示']).includes(v.value)):typeof v.value!=='boolean')throw Error('Unsupported object property value');}else if('value' in v)throw Error('Parent mode does not accept a custom value');}
    }
  }
  if(name==='drawing_save_object_config'&&(!Array.isArray(value.receiptIds)||!value.receiptIds.length||value.receiptIds.length>20||new Set(value.receiptIds).size!==value.receiptIds.length||value.receiptIds.some(v=>typeof v!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(v))))throw Error('Distinct object receipt IDs required');
  if(['drawing_create_annotation_style','drawing_update_annotation_style'].includes(name)&&!/^[A-Za-z0-9_-]{8,100}$/.test(value.requestId||''))throw Error('Invalid annotation request ID');
  if(name==='drawing_create_annotation_style'&&!value.name?.trim())throw Error('Explicit annotation name required');
  if(name==='drawing_update_annotation_style'){
    const s=value.expectedStyle,p=value.changes;
    if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join(',')!=='id,name'||!s.id||!s.name||Object.values(s).some(v=>typeof v!=='string'||v.length>200))throw Error('Original annotation ID and name required');
    if(!p||typeof p!=='object'||Array.isArray(p)||!Object.keys(p).length||Object.keys(p).some(k=>!['name','fontSize'].includes(k))||Object.values(p).some(v=>typeof v!=='string'||!v.trim()||v.length>100))throw Error('Only explicit annotation changes are supported');
    if(p.fontSize!==undefined&&(value.annotationKind!=='text'||!/^\d+(\.\d+)?$/.test(p.fontSize)||!Number.isFinite(Number(p.fontSize))||Number(p.fontSize)<=0))throw Error('Positive platform font size is only supported for text styles');
  }
  if(name==='drawing_save_annotation_styles'&&(!Array.isArray(value.receiptIds)||!value.receiptIds.length||value.receiptIds.length>20||new Set(value.receiptIds).size!==value.receiptIds.length||value.receiptIds.some(v=>typeof v!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(v))))throw Error('Distinct annotation receipt IDs required');
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

