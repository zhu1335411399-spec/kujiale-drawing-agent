# 施工图配置 Agent

独立项目：kujiale-drawing-agent。施工图 Skill、MCP、浏览器扩展、reference 和安装脚本全部集中在本仓库，不再依赖参数化建模仓库目录。

## 从这里开始

- [Skill 入口](.agents/skills/kujiale-drawing-bridge/SKILL.md)
- [完整验收流程](.agents/skills/kujiale-drawing-bridge/references/workflow.md)
- [页面与接口参考](.agents/skills/kujiale-drawing-bridge/references/routes.md)
- [MCP 工具说明](mcp/DESIGN.md)
- [待更新内容](docs/pending-updates.md)
- [迁移记录](docs/migration.md)

## 目录

| 目录/文件 | 内容 |
|---|---|
| .agents/skills、.claude/skills | Codex / Claude 对应 Skill 镜像 |
| skills | 安装包使用的同一份 Skill |
| mcp | MCP 服务、工具、协议、诊断和测试 |
| browser-extension | 浏览器扩展源码 |
| docs、examples | 来源、变更、验证记录和验收计划 |
| installer | 安装说明 |
| Start.cmd、start.ps1 | 完整运行包的一键启动入口 |
| install.ps1、build.ps1 | 安装、配置生成及打包 |
| runtime/LICENSE | Node 官方许可证；二进制不进入源码仓库 |

## 版本与使用边界

当前冻结发行基线为 0.5.0。本次只整理独立项目，保留原发行包、标签和校验文件，不重新发布。

历史完整包仍在 [原仓库 0.5.0 发行页](https://github.com/zhu1335411399-spec/kujiale-model-agent/releases/tag/drawing-v0.5.0)。等独立仓库建立并验证完成后，再迁移发行附件；不能把源码 ZIP 当作含 Node 的运行包。

已实现三个只读工具。保存/发布工具已注册，但执行适配器未验证。前端更新配置、自动标注、另存为、出图及恢复尚未自动接通。模板类型检查已暂存，待下次正式更新集成。

源码运行/打包需 Node.js 20+。完整运行包自带 Node；首次使用仍需用户加载扩展、信任 AI 客户端项目，并登录自己的账号。运行包不内置 AI 聊天软件或账号。

## 开发检查

```powershell
node mcp/native-test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
```

GitHub 工作流保持手动触发，整理或修改参考资料不会自动发布新包。

