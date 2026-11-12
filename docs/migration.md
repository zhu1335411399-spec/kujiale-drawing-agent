# 独立项目迁移记录

整理日期：2026-11-12。

来源：zhu1335411399-spec/kujiale-model-agent 的 construction-drawing-config，读取版本 85fbea0d1a285c387674209056bdf75002fa8db1。

原 source-snapshot 中的 MCP、扩展、安装脚本等已提升到独立仓库根目录。通用 Skill 和参考放入 .agents/skills，并与 .claude/skills 和安装用 skills 保持一致。原路径与新路径关系：

| 原路径 | 新路径 |
|---|---|
| construction-drawing-config/source-snapshot/mcp | mcp |
| construction-drawing-config/source-snapshot/browser-extension | browser-extension |
| construction-drawing-config/source-snapshot/skills | skills |
| construction-drawing-config/.agents、.claude | .agents、.claude |
| construction-drawing-config/docs、examples | docs、examples |
| construction-drawing-config/source-snapshot 安装脚本 | 仓库根目录 |

0.5.0 安装包、标签及校验附件不变；企业模板/行业模板规则保留为待更新内容。工作流改为手动触发，避免迁移自动发布。

目标独立仓库 kujiale-drawing-agent 已由用户创建为 public，用户于 2026-11-12 明确要求所有仓库公开，本次导入按该授权执行。独立仓库上传及回读核验成功后，仅清理原仓库中近期施工图子目录和对应工作流，原历史与 0.5.0 发行附件保留。

