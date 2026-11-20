# 服务、工具与 Skill 的关系

## 当前盘点（2026-11-20）

项目声明一个 MCP 服务：`construction_drawing`。当前源码和运行网关的 `tools/list` 均返回 30 个工具。注册数量包含诊断、实验和占位入口，不等于 30 项完整可用业务。

| 层次 | 当前实现 | 作用 |
|---|---|---|
| 主 Skill | `skills/kujiale-drawing-bridge/SKILL.md` | 判断任务、选择工具、约束保存发布和验收顺序 |
| 专题 reference | 同目录 `references/` | 线样式、注释、对象、客户载入、前端检查等按需流程资料 |
| MCP 服务 | `construction_drawing` | 向 Host 注册一组工具 |
| MCP 工具 | `mcp/tools.mjs`，当前 30 项 | 接受参数并执行具体能力，按实际回执判断结果 |
| 本机网关 | `mcp/http-server.mjs`，本机 8788 | 将请求交给已连接浏览器扩展 |
| 浏览器扩展 | `browser-extension/` | 在已登录的目标页面执行受限操作并回传证据 |

线样式、注释、对象、前端校验是同一服务内的业务分组，当前未拆成独立服务。Chrome 和 Edge 是两条浏览器会话，不是两个 MCP 服务。只有访问隔离、部署和维护确实需要独立时再拆服务。

## 工具分组

| 分组 | 工具数 | 选择原则 |
|---|---:|---|
| 上下文与当前页面读取 | 3 | get_context、read_config、list_line_styles |
| 客户配置载入 | 1 | load_customer_config；不切换浏览器登录身份 |
| 线样式 | 7 | 包含旧实验入口；日常先查 create_line_draft、search/update/save 的适用边界 |
| 注释样式与通用样式检查 | 5 | 四类分别识别；文本字段能力不推广至其他三类 |
| 对象配置 | 4 | inspect、update_object_properties、replace_object_line_style、save_object_config |
| 前端账号、导航、更新和画面 | 6 | 身份显示、模板、更新成功和画面效果分别核对 |
| 接口研究 | 2 | capture_api、read_api；HTTP 200 不等于业务成功 |
| 通用保存与发布占位 | 2 | save_config、publish_config 尚无已验证的通用写入能力 |

具体可用状态以 [能力清单](../skills/kujiale-drawing-bridge/references/capabilities.md) 和实际部署回执为准。

## 为什么没有很多子 Skill

项目最初只有一个主 Skill。现已补充五个独立业务 Skill，见 [业务入口与 Host 接入](business-skills-and-host.md)。三个目录仍是同一组内容的安装/客户端镜像，不是三套业务。references 是专题资料，不单独算作 Skill。

当前采用“主入口 + 五个业务入口 + 共用专题 reference”，共享账号、模板、保存和发布规则；不为每个工具复制一份 Skill。新增 Skill 不会自动新增 MCP 服务，也不会自动让 Host 发现工具。

## 为什么聊天里显示运行命令

若当前 Host 会话直接提供施工图工具，优先直接调用对应工具。若当前会话未暴露这些工具，但本机网关可访问，可使用 MCP 客户端向本机 `/mcp` 发送标准 JSON-RPC `tools/call`。此时聊天界面显示外层命令执行；请求内层仍是 MCP 工具调用。不能只凭界面卡片判断是否使用 MCP，应核对工具名、参数、请求回执和业务结果。

重复任务仍使用已有工具。将对象线条改回原值，是用同一替换工具传入原始引用，再独立保存、更新前端和检查画面；不需要另写网页动作，也不是恢复历史版本。结果未知时先查状态，不能重复提交已确认写入。

## 统一 Host 接入

当前开发链路：Host STDIO → `mcp/http-client-stdio.mjs` → 本机网关 → 扩展 → 已登录网页。

使用 [HTTP 网关适配示例](../examples/mcp-http.json) 配置 Host。仓库根 `.mcp.json` 仍指向旧原生入口，不能将它与当前 HTTP 开发入口混用；本说明不自动改动用户 Host 配置。配置完成后，在目标 Host 会话核对 `tools/list`，再只读调用 `drawing_get_context`，确认工具确实可直接使用。仅浏览器“已连接”不代表 Host 已发现工具。

## 已观察的恢复验收

2026-11-20，实际对象线样式恢复后完成后台保存回读、客户前端企业模板核对、更新配置成功提示和图面查看。当前平面布置中两处柜体的亮红粗轮廓恢复为深灰，墙线正常可见。未发布，未选择全部重新生成；不推广为其他视图、主题或全部真分类均已验收。
