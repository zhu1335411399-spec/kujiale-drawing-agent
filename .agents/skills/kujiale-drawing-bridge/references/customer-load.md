# 通用载入客户配置

工具：`drawing_load_customer_config`。使用当前已登录浏览器的网页载入流程，目标可以是当前操作员有权限访问的任意主账号；不会切换浏览器登录账号。

## 调用

先调用 `drawing_get_context`，从目标配置页取得 `pageId` 和 `identity.configStatusText`。不要把左上角操作员名称当作已载入客户名称，不要复用其他页面或切换前的状态。

以下为占位示例，必须替换 pageId、expectedStatus 和目标名称：

```json
{
  "pageId": "<当前配置页标识>",
  "customerName": "示例客户",
  "expectedStatus": "<刚读取的 configStatusText>",
  "mode": "load"
}
```

一般按名称直接载入。需要查看候选项时，将 mode 改为 `inspect`；它打开载入框、查询候选项并返回匹配列表，不提交载入。对话框会保留。

同名时返回 `ambiguous-customer`，不选第一个。再次调用时传入 inspect 结果中的完整标签：

```json
{
  "pageId": "<当前配置页标识>",
  "customerName": "示例客户",
  "customerLabel": "示例客户 (a***@example.test)",
  "expectedStatus": "<刚读取的 configStatusText>",
  "mode": "load"
}
```

工具在账号选择框搜索名称，检查已呈现候选列表及虚拟滚动项，准确选择完整标签，再点击载入。账号无权限、搜索无结果、列表无法确认完整或同名无法区分时停止；不尝试猜测账号 ID，也不绕过权限。

## 结果与后续操作

| status | 含义 | 下一步 |
|---|---|---|
| dialog-inspected | 只检查候选项，未提交 | 按匹配结果调用 load |
| already-loaded | 当前来源名称相同且候选唯一，未重复载入 | 核对 selectedTemplate 后继续 |
| source-label-verified | 已提交载入、对话框关闭，来源名称匹配 | 再调用 drawing_get_context，核对模板和后续操作目标 |
| ambiguous-customer | 同名候选不唯一 | 使用完整 customerLabel 区分 |
| customer-not-found | 可访问候选中未匹配目标 | 核对名称与当前操作员权限 |
| unconfirmed-drafts | 存在尚未确认保存的已记录草稿 | 先处理草稿；工具不自动保存或丢弃 |
| inspection-failed | 页面、候选项或前置状态无法确认 | 检查 error，重新定位页面 |
| load-outcome-unverified | 已提交但最终结果未确认 | 只读检查当前结果，禁止盲目重复提交 |

返回 `selectedTemplate` 为载入后侧边基础配置的当前选项；只有唯一候选时才填写。排除表格和分页选择器，不硬编码模板名称，不强制选择 RICE1 或行业模板。

`loaded:true` 仅核验页面的来源显示名称；`identityVerified:false` 明确表示未取得真实账号 ID。指定完整 customerLabel 时会执行选择和载入，不凭同名来源标签跳过。`saved:false`、`published:false` 表示本工具不执行保存或发布，也不表示原配置此前未保存。

草稿阻挡来自扩展已记录的新建草稿，不能检测全部手动未保存修改。网站出现额外的覆盖、丢弃或编辑锁提示时，工具不会自动确认。结果不确定时只读回查。

## 真实页面证据范围

新版入口已通过 MCP 在真实页面查询目标账号、识别完整候选标签，并返回 `already-loaded`；回读到了唯一的侧边模板，未重复提交载入，也未保存或发布。这证明该页面的候选查询、已载入识别与模板回读；跨用户实际切换尚未作为本次验收证据。

名称匹配、同名阻挡、完整标签选择、提交后回读和失败处理另有适配器回归检查；模拟检查不代替真实账号切换验收。
