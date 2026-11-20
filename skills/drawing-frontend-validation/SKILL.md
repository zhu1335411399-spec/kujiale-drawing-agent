---
name: drawing-frontend-validation
description: 后台保存后在客户设计端核对账号企业模板、更新配置、对照实际图面或检验恢复效果时使用。
---

# 前端同步与效果验收

先遵守 [主流程](../kujiale-drawing-bridge/SKILL.md) 的账号、目标、保存和发布规则。子 Skill 是任务入口，不是新 MCP 服务。

1. 取得后台已保存回读证据；绑定前端浏览器、pageId、方案标题与客户显示名称。普通设计页使用 drawing_read_frontend_account，业务开始需要时 refresh=true，不循环悬停。施工图工作区隐藏头像时，显式调用 drawing_frontend_navigation(action=refresh-account-in-drawing)：确认无弹窗后退出、读取设计页头像名称及可见 ID、返回原工作区；名称不符或状态不确定时停止并报告当前位置。只读账号工具返回 identity-refresh-required 时，保留的名称是历史证据，不能作为本轮新核验。
2. 使用 drawing_sync_frontend_configuration 的 inspect 核对当前企业模板与更新时间。行业模板不能用于客户个性化验收；模板不明或归属歧义时停止写入。
3. 同一 requestId 执行 update，必要时 confirm，之后 verify。全部重新生成必须明确未勾选；遇到覆盖手工标注等额外范围时不自行确认。成功需本任务新出现的明确成功提示。
4. 已提交结果不明只 verify，不重新 update/confirm。断线恢复先读取当前文档与任务状态，不重复后台编辑或已完成保存。
5. drawing_capture_frontend_view 读取实际图面并检查目标对象。纯黑 canvas 导出不证明样式失效；使用已支持的合成画面读取。账号显示匹配、配置更新成功和视觉验收分别记录。
6. 场景为空时不能判失败或自动拖入模型；检查目标视图、主题、对象存在与视图自定义覆盖。当前截图只能证明当前视图，不测量最终物理线宽。
7. 需要剖切或自动标注时说明对应场景和未接通步骤；不自动全部重建、不保存方案、不发布配置。

## 按需读取

- [frontend-identity.md](../kujiale-drawing-bridge/references/frontend-identity.md)
- [frontend-sync.md](../kujiale-drawing-bridge/references/frontend-sync.md)
- [frontend-capture.md](../kujiale-drawing-bridge/references/frontend-capture.md)
- [workflow.md](../kujiale-drawing-bridge/references/workflow.md)

## 后续封装提醒

新增能力若包含多步业务判断、跨配置依赖、补偿还原或独立验收，提醒用户纳入或新增业务 Skill；单个确定性动作优先复用 MCP 工具。不把 reference 或工具注册称为已完成流程。
