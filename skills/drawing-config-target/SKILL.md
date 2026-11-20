---
name: drawing-config-target
description: 处理企业自配置、操作员代配、载入客户、确认基础配置和前后端目标时使用。
---

# 客户与配置定位

先遵守 [主流程](../kujiale-drawing-bridge/SKILL.md) 的账号、目标、保存和发布规则。子 Skill 是任务入口，不是新 MCP 服务。

1. 读取 drawing_get_context，区分企业自配置和内部操作员代配。企业配置仅由企业账号操作；载入客户不等于切换登录账号。
2. 绑定后端 pageId、客户来源、配置名称和最新状态。必要时使用 drawing_load_customer_config 查询真实候选；同名用完整标签区分，保留客户当前默认模板。
3. 前端使用 drawing_read_frontend_account 核对浏览器、页面和显示名称；实际 ID 缺失不猜测。不同账号使用隔离浏览器会话。
4. 交付准确目标与证据时间，不自动修改、保存、发布或切换模板。
5. 目标歧义、只读锁、未保存提示或账号变化时停止依赖写入，保留已完成步骤。重新连接后先重读目标，不重做已确认载入。

## 按需读取

- [customer-load.md](../kujiale-drawing-bridge/references/customer-load.md)
- [frontend-identity.md](../kujiale-drawing-bridge/references/frontend-identity.md)
- [workflow.md](../kujiale-drawing-bridge/references/workflow.md)

## 后续封装提醒

新增能力若包含多步业务判断、跨配置依赖、补偿还原或独立验收，提醒用户纳入或新增业务 Skill；单个确定性动作优先复用 MCP 工具。不把 reference 或工具注册称为已完成流程。
