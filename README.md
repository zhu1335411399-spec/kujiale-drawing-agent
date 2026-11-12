# 施工图配置 Agent

独立项目，仅包含施工图 Skill、MCP、扩展、reference、安装脚本与本机桥接管理器。参数化模型、周报和搭建练习分别留在各自仓库。

## 0.6.0：安装修复与统一连接检测

下载 [Windows 运行包](https://github.com/zhu1335411399-spec/kujiale-drawing-agent/releases/tag/drawing-v0.6.0) 的 ZIP 附件，解压后运行 Start.cmd；首次安装成功后打开 DrawingBridgeManager.exe。首次构建完成后发行页才会出现附件，以 Actions 实际结果为准。

管理器常驻托盘，统一显示 Chrome/Edge 宿主注册、扩展心跳、实际页面列表、本机服务和最近 MCP 调用。点击“修复接入”修复注册；失败会显示具体错误。首次仍需手动加载扩展、信任 AI 客户端项目和登录账号。

0.5.0 历史发行包保持不变。0.6.0 是连接检测预览版，不是完整自动配置产品。保存、发布执行适配器未验证，其他前端业务自动操作尚未接通。

## 文件分类

| 目录 | 内容 |
|---|---|
| desktop | Windows 托盘界面、注册检查与构建脚本 |
| mcp | MCP、统一心跳检测、服务、诊断及测试 |
| browser-extension | Chrome/Edge 扩展与实时页面报告 |
| .agents/skills、.claude/skills、skills | 同步的 Skill 入口及 references |
| docs、examples | 流程、待办、来源及验证记录 |
| Start.cmd、install.ps1、build.ps1 | 安装与打包入口 |

[管理器说明](desktop/README.md) · [Skill](.agents/skills/kujiale-drawing-bridge/SKILL.md) · [完整流程](.agents/skills/kujiale-drawing-bridge/references/workflow.md)

源码构建需要 Node.js 20+，完整发行包携带运行时。构建输出不会包含账号、令牌或客户数据。
