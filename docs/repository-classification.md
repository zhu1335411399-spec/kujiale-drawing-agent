# 仓库分类与迁移边界

核对日期：2026-11-12。按实际用途归类，不按文件名中的相似关键词强行移动。

| 大分类 | 独立仓库 | 内容与处理 |
|---|---|---|
| 参数化模型 | kujiale-model-agent | 保留模型 editorData、变量/公式、柜体结构、部件替换、报价、产品包、参数化桥接及模型测试 |
| 施工图配置 | kujiale-drawing-agent | 迁入最近 construction-drawing-config 的 Skill、MCP、扩展、reference、验收流程及安装脚本 |
| 周报统计 | kujiale-weekly-skills | 保留周数据、VIP、排名、异常与统筹检查规则，不迁入施工图 |
| 搭建练习 | agent-building-practice | 保留 Coohom 尺寸修改、新建目录 Skill 与 coohom-folders MCP；这些不是近期施工图工具 |

## 参数化模型保留范围

七个模型通用 Skill 均保留：custom-furniture-structure、kujiale-batch-query、kujiale-model-quotation、kujiale-product-packages、model-instance-replacement、param-model-project-maintenance、param-model-workbench。

board-reconstruction.md 是参数化工作台参考，不能因为名字中出现 reconstruction 就当作施工图配置迁移。模型项目的 browser-bridge-mcp、parameditor-mcp-server、模型扩展、design-tool-miniapp、桌面端、安装器及回归测试保留原相对路径，避免破坏引用。

## 施工图迁移范围

明确归属范围仅限原 construction-drawing-config/ 及 .github/workflows/construction-drawing-release.yml。新独立项目将 source-snapshot 的代码提升至根目录，Skill 及 references 保持独立镜像。迁移准备目录已具备 57 个文件并通过 MCP 与镜像检查。

## 迁移前置与当前状态

用户于 2026-11-12 明确授权所有仓库公开。施工图仓库已为 public，本次按授权迁入源码。其他三个仓库当前仍为 private；现有 GitHub 工具不提供修改仓库可见性的接口，公开设置仍需另行完成，不能把用户授权误报成设置已成功。

新仓库导入、哈希及引用回读验证成功后，再从模型仓库清理明确的施工图子目录和对应工作流；不提前删除源文件。历史 0.5.0 发行附件保持不变，不为这次目录整理重新发布。

其他工具归属不明确时先保留原位并登记，不能因同属酷家乐就混入施工图。

