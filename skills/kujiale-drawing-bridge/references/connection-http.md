# 当前 HTTP 桥接开发入口

当前源码开发链路：MCP Host 的 STDIO → http-client-stdio.mjs → 本机 JSON-RPC 网关 127.0.0.1:8788/mcp
→ 扩展 HTTP 轮询 → 已登录的施工图页面。8788 是本机端口，不是酷家乐业务接口。
源码开发入口与旧版桌面管理器的原生消息链路不同，不能用旧管理器状态代替当前调用验收。

## 启动

1. 使用 Node.js 20+ 在仓库根目录执行 `node mcp/http-server.mjs`，保持进程运行。
2. Chrome 中以“加载已解压的扩展程序”加载仓库 browser-extension 目录，进入已登录施工图后台。
3. MCP Host 配置 STDIO：command 为 node，args 为 mcp/http-client-stdio.mjs 的绝对路径。
   参见 examples/mcp-http.json，将占位目录替换为实际路径。
4. 调用 drawing_get_context 检查连接。MCP Host 不需要直接访问酷家乐登录凭据。

此网关实现 JSON-RPC 请求/响应，主机优先通过 STDIO 适配器接入；不宣称已完成所有主机的
Streamable HTTP/SSE 兼容测试。浏览器端默认只接受项目固定扩展 ID 的 Origin，manifest key
应保持一致。不能将监听地址改为公网或放宽 Origin 以掩盖连接错误。

## 采集部署

网络采集使用 debugger 权限，仅用于选定配置页的已知同源业务路径，不自动发送业务请求。
记录保存在扩展 session storage，可跨网页刷新和后台服务工作线程重启保留；重启浏览器、
停用或重新加载扩展会清空记录。关闭开发者工具后开始；开发者工具可能中断监听，检查 stopReason。
编码正文不解码；只对有界 JSON 做已知敏感键脱敏。业务数据仍可能敏感，不能提交真实采集结果到仓库。

## 排查

- Unknown tool：检查本机服务是否加载当前代码。
- Unsupported readonly operation：浏览器扩展代码仍旧，需重新加载扩展，而非只点击重新连接。
- Line-style table not found：检查是否位于“注释样式”或“通用设置”子标签。
- 连接失败：先查端口、本机服务及扩展状态，不重装、不放宽权限、不启动未知副本。

## 扩展日常面板

当前面板保留连接、页面选择、账号及可见 ID 读取；原始接口、编码配置和采集探测按钮已移出日常入口。研究用 MCP 诊断能力保留。页面账号 ID 与浏览器会话、MCP 页面、标签页 ID 分开显示，未知字段不猜测。详见 [精简面板](https://github.com/zhu1335411399-spec/kujiale-drawing-agent/blob/main/docs/extension-panel.md)。
