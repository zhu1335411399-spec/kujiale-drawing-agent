---
name: drawing-object-workflow
description: 按大类和真分类修改可选择性、剖切模式、侧面显示或线样式引用，以及恢复本次实验原值时使用。
---

# 对象配置与还原

先遵守 [主流程](../kujiale-drawing-bridge/SKILL.md) 的账号、目标、保存和发布规则。子 Skill 是任务入口，不是新 MCP 服务。

1. 用 drawing_inspect_object_config 定位对象属性或显示样式，核对选中大类与表格根行一致。记录真分类名称和 ID，不猜固定分类全集。
2. 修改前记录完整属性原值、继承模式、主题、列、原引用及预览。unmarked 不是已知继承模式；不能承诺未知元数据精确还原。
3. 属性使用 drawing_update_object_properties；线条引用使用 drawing_replace_object_line_style。明确 light/dark 与造型线/轮廓线/截面线；填充不是线样式。替换引用不等于编辑共享样式。
4. 父类变更允许预期继承后代同列变化，自定义引用、其他列和节点变化需停止复核。原值快照过期时重新读差异，不覆盖并发修改。
5. drawing_save_object_config 独立保存回执，刷新回读原 ID。确认提交后不重放写入，再交给前端验收流程。
6. 用户要求还原时，复用相同编辑工具写回已记录原值并保存；仅还原本任务字段，不恢复整个历史版本、不删除测试样式、不覆盖其他人的变更。
7. 报告恢复的原引用/有效值和未知继承信息。剖切须在立面范围真实剖到对象时验收，不能用平面图代替。

## 按需读取

- [object-config.md](../kujiale-drawing-bridge/references/object-config.md)
- [workflow.md](../kujiale-drawing-bridge/references/workflow.md)

## 后续封装提醒

新增能力若包含多步业务判断、跨配置依赖、补偿还原或独立验收，提醒用户纳入或新增业务 Skill；单个确定性动作优先复用 MCP 工具。不把 reference 或工具注册称为已完成流程。
