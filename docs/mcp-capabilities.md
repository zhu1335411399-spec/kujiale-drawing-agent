# MCP 与参考文档入口

## 已可用

- [能力分组与状态](../skills/kujiale-drawing-bridge/references/capabilities.md)
- [通用新建线样式：参数、执行和失败恢复](../skills/kujiale-drawing-bridge/references/line-style-create.md)
- [当前 HTTP 连接与主机配置](../skills/kujiale-drawing-bridge/references/connection-http.md)
- [通用工具请求示例](generic-line-style-mcp.md)
- [通用载入客户配置](../skills/kujiale-drawing-bridge/references/customer-load.md)：任意有权访问的主账号、同名区分、来源与默认模板回读。

真实页面已完成一条线样式草稿：自定义名称、DOT、颜色 255、0.09 mm，比例保留网页默认值。
该证据只证明页面字段设置和回读，不证明持久化保存，不代表全部可选值均已验证。
另一组参数验证时页面停留在注释样式子标签，工具在新建前拒绝执行，没有将其计为成功。

## 前端账号只读采集

新增 drawing_read_frontend_identity，使用实际浏览器类型和 pageId 定位，分 inspect 与 hover 两步，读取头像关联名称。
详见 [前端头像读取](../skills/kujiale-drawing-bridge/references/frontend-identity.md)。已确认两个浏览器连接，不等于已读取头像或完成图纸验收。

## 代码分组

| 目录 | 职责 |
|---|---|
| mcp | 工具声明、协议路由、本机服务、STDIO 适配器与测试 |
| browser-extension | 真实页面操作、控件适配、读取与诊断 |
| skills/kujiale-drawing-bridge | 仓库随附操作指南和按需参考文档 |
| .agents/skills、.claude/skills | 同内容的客户端入口副本 |
| examples | 可复制的主机配置占位模板 |

不上传登录凭据、会话标识、真实配置 JSON、采集正文、Node 二进制或本机运行日志。
本文档与源码更新不修改历史发布包；不代表已安装为当前 ChatGPT 个人技能。
