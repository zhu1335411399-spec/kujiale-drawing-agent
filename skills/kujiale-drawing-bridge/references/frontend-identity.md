# 前端头像与企业名称核对

工具：`drawing_read_frontend_identity`。这是前端身份采集入口，尚不是完整图纸校验服务。只读取指定设计页右上角头像的 title、悬停提示或实际账号菜单名称，不点击菜单、不切换账号、不读取 Cookie/令牌，不修改、保存或发布配置。

## 定位

1. 调用 `drawing_get_context`。每个浏览器会话返回 `browser`（扩展上报的 Chrome/Edge）；不要按数组顺序、网页域名或“未命名”标题猜浏览器。
2. 代配基础配置时，后端目标取“来自于”名称，不取操作员名称。企业自配置时按当前企业账号核对。不同账号前后端须使用独立会话。
3. 在目标浏览器中选择 `role:design` 的 pageId。单一浏览器的其它设计标签不能替代另一个客户浏览器的设计页。

## 两阶段读取

先检查实际页面元素（示例使用占位值）：

```json
{
  "pageId": "<目标设计页 pageId>",
  "action": "inspect",
  "expectedBrowser": "Edge",
  "expectedCompanyName": "示例企业"
}
```

结果按 `frames` 返回页面和可访问 iframe 的诊断。仅返回页首右侧可见头像/图片候选；候选不等于已确认头像。选择真实头像所在帧及其 `avatarKey`，不要任意取第一个图标。无法判断时保留待定位，不在整页搜索预期公司名称代替头像证据。

```json
{
  "pageId": "<同一设计页 pageId>",
  "action": "hover",
  "expectedBrowser": "Edge",
  "expectedCompanyName": "示例企业",
  "frameId": 0,
  "avatarKey": "<inspect 返回的目标头像 avatarKey>"
}
```

读取器重新确认头像标识及位置，触发悬停事件，读取关联 title、aria-describedby 提示、新出现的邻近 tooltip，或已在真实页面确认的账号菜单名称元素，最后移除悬停状态。页面跳转、浏览器不匹配或头像变化时停止。只规范空白，不模糊匹配账号名称。悬停事件不能触发页面实现、提示是原生标题以外的未知弹层、证据有多个名称或页面采用无法识别的头像结构时，结果保留未知，须按真实 DOM 适配。

## 结果

| status | 含义 |
|---|---|
| identity-inspected | 返回候选与所在 frameId，未做悬停 |
| display-name-match | 选定头像的唯一名称与预期一致 |
| display-name-mismatch | 选定头像的唯一名称与预期不一致 |
| identity-unconfirmed | 没有可读名称或证据无法唯一确定 |
| identity-read-failed | 浏览器、页面、头像或读取过程不符合要求 |

`identityVerified:false` 表示没有验证真实账号 ID；显示名称匹配只完成用户认可的日常账号显示核对，不能证明主子账号归属、模板一致或配置已生效。必须另外检查模板与更新结果。证据在结果中包含读取时间、来源、原始显示文字及元素位置；不保存到公共仓库。

## 部署与验收范围

新增指令首次部署后，需要在实际使用的浏览器扩展管理页重新加载扩展卡片一次；重新连接按钮不更新已经加载的工作线程代码。后续修改单独的 frontend-identity-page.js 会在调用时重新注入，通常不需再次重载扩展。

已在真实页面通过 MCP 完成：分别识别 Chrome 后台与 Edge 设计页，定位唯一的页首头像，触发悬停，读取自定义账号菜单的企业名称，并与当次后台来源名称匹配，返回 display-name-match。实际账号菜单使用 [class*="TopBar-account-name_"]，不是通用 tooltip；只读取目标头像附近可见的该元素，不在整页搜索预期名称。该证据只证明这一页面版本的显示名称核对，不能推广成模板或配置版本已匹配。旧原生宿主进程启动检查在当前环境未通过；本次使用已实际接通的 HTTP 桥接，不要求为此重装宿主。
