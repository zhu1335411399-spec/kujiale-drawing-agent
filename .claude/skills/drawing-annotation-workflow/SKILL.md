---
name: drawing-annotation-workflow
description: 文本、引线、尺寸、标高样式的新建、搜索、规范检查、受支持编辑及回执保存时使用。
---

# 注释样式维护

先遵守 [主流程](../kujiale-drawing-bridge/SKILL.md) 的账号、目标、保存和发布规则。子 Skill 是任务入口，不是新 MCP 服务。

1. 绑定当前客户配置，明确 annotationKind=text、leader、dimension 或 elevation。读取 drawing_inspect_style_settings 的真实字段和分组，不套用文本编辑器到其他类别。
2. drawing_search_annotation_styles 按名称搜索；不完整结果不能用于唯一写入。新建使用 drawing_create_annotation_style，核对名称向导、规范面板和新 ID。
3. drawing_update_annotation_style 仅使用已支持字段。文本字号已真实验证；另外三类规范字段未适配，独立重命名不能因字号成功而宣称已验收。
4. 汇总同一目标连续回执后调用 drawing_save_annotation_styles，按原 ID、名称和修改字段刷新回读。不自动发布。
5. 超时或部分失败先查同 ID 实际状态，禁止再次新建或重复提交未知保存。遇到新面板先只读识别并报告待适配字段。
6. 样式库编辑和标注/图纸文本引用替换分别验收；当前尚不能宣称跨配置引用替换或前端效果已接通。

## 按需读取

- [annotation-styles.md](../kujiale-drawing-bridge/references/annotation-styles.md)
- [annotation-write.md](../kujiale-drawing-bridge/references/annotation-write.md)

## 后续封装提醒

新增能力若包含多步业务判断、跨配置依赖、补偿还原或独立验收，提醒用户纳入或新增业务 Skill；单个确定性动作优先复用 MCP 工具。不把 reference 或工具注册称为已完成流程。
