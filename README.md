# 施工图配置 Agent

独立项目：kujiale-drawing-agent。施工图 Skill、MCP、浏览器扩展、reference 和安装脚本全部集中在本仓库，不再依赖参数化建模仓库目录。

## 从这里开始

- [Skill 入口](.agents/skills/kujiale-drawing-bridge/SKILL.md)
- [完整验收流程](.agents/skills/kujiale-drawing-bridge/references/workflow.md)
- [页面与接口参考](.agents/skills/kujiale-drawing-bridge/references/routes.md)
- [四类注释样式与配色规则](.agents/skills/kujiale-drawing-bridge/references/annotation-styles.md)
- [注释样式实际盘点](docs/annotation-style-inspection.md)
- [对象属性、显示样式与前端验收](skills/kujiale-drawing-bridge/references/object-config.md)
- [注释样式新建、搜索、文本字号编辑与保存](skills/kujiale-drawing-bridge/references/annotation-write.md)
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

当前冻结发行基线为 0.5.0，源码能力继续开发；保留原发行包、标签和校验文件，本轮不重新发布安装包。

历史完整包仍在 [原仓库 0.5.0 发行页](https://github.com/zhu1335411399-spec/kujiale-model-agent/releases/tag/drawing-v0.5.0)。等独立仓库建立并验证完成后，再迁移发行附件；不能把源码 ZIP 当作含 Node 的运行包。

当前源码包含页面读取、客户载入、前端头像核对、新建线样式草稿，以及线样式名称搜索、指定记录编辑与回执保存。操作流程及实际验收状态见 [能力分组](skills/kujiale-drawing-bridge/references/capabilities.md) 和 [线样式搜索编辑](skills/kujiale-drawing-bridge/references/line-style-edit.md)。通用 drawing_save_config / drawing_publish_config 仍为未执行入口；线样式回执保存不代表其他分类已支持。前端更新配置、自动标注、另存为、出图及恢复尚未自动接通。

注释样式也提供同一服务下的专用工具：四类新建、名称搜索、文本字号修改和回执保存已完成真实页面操作，并在刷新、重载原客户后按原 ID 和字段回读。其他规范字段、独立重命名及前端应用尚未验收，详见上方注释写入流程。此次更新不发布新安装包。

源码运行/打包需 Node.js 20+。完整运行包自带 Node；首次使用仍需用户加载扩展、信任 AI 客户端项目，并登录自己的账号。运行包不内置 AI 聊天软件或账号。

对象配置新增专用工具：大类/真分类读取、三属性编辑、线样式引用替换和回执保存。墙的三属性自定义与浅底造型线替换已在真实页面完成保存、刷新及同 ID 回读；前端企业模板、更新配置与最终效果尚未验收。详见对象配置参考，不将单一对象的验证扩大到所有分类和字段。

## 开发检查

```powershell
node --test mcp/line-style-runtime.test.mjs mcp/line-style-actions.test.mjs mcp/trusted-line-input.test.mjs mcp/http-server.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
```

修改页面操作源码后运行 `node scripts/build-config-page-runtime.mjs` 生成扩展配置页适配文件；修改工作线程引用的模块后，在实际使用的浏览器重新加载扩展。运行测试或打包不代表已完成真实网页操作。

GitHub 工作流保持手动触发，整理或修改参考资料不会自动发布新包。

