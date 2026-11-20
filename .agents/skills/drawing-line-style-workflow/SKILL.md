---
name: drawing-line-style-workflow
description: 新建、按名称搜索、编辑线型比例颜色线宽、保存并回读线样式时使用。
---

# 线样式维护

先遵守 [主流程](../kujiale-drawing-bridge/SKILL.md) 的账号、目标、保存和发布规则。子 Skill 是任务入口，不是新 MCP 服务。

1. 读取上下文并绑定客户、模板；网页名称搜索要求 complete=true，按 ID 与完整原值唯一定位，不把当前页过滤当作全库搜索。
2. 新建使用 drawing_create_line_draft；比例目前不接受参数，保留实际默认值。已有记录使用 drawing_update_line_style，只传 changes。CONTINUOUS 不写比例，颜色和线宽使用实际选项。
3. 编辑取得 receiptId 后调用 drawing_save_line_style，观察保存反馈并刷新回读同 ID。引用已有样式的对象可能同时受影响，应说明范围未知。
4. 新建草稿不能直接交给编辑保存入口。确有比例等后续编辑需求时按新快照编辑再保存；没有需求时不得伪造无意义编辑来换回执，明确草稿转保存缺口。
5. 部分失败先读取实际行、ID 与已完成字段；同一任务保留 requestId 和参数，不新建第二条。不用旧实验完整流程或通用保存占位补救。
6. 报告新建/编辑、保存回读和前端应用三个独立状态。复制、删除与批量导入尚未作为通用已验证流程。

## 按需读取

- [line-style-create.md](../kujiale-drawing-bridge/references/line-style-create.md)
- [line-style-edit.md](../kujiale-drawing-bridge/references/line-style-edit.md)
- [line-styles.md](../kujiale-drawing-bridge/references/line-styles.md)

## 后续封装提醒

新增能力若包含多步业务判断、跨配置依赖、补偿还原或独立验收，提醒用户纳入或新增业务 Skill；单个确定性动作优先复用 MCP 工具。不把 reference 或工具注册称为已完成流程。
