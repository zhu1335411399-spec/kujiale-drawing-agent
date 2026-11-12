# 0.5.0 本机换路径验证

日期：2026-11-12。基于当前 Windows 实际源码执行，不涉及客户配置写入。

- 源码 native-test.mjs：通过。覆盖协议、双浏览器、读取、超时、断连、工具门禁及来源检查。
- build.ps1：生成含运行时的 ZIP，文件清单 51 项，逐项 SHA-256 核对通过。
- 解压并安装准备到独立含空格目录，PrepareOnly + NoOpen：通过。
- 随包 Node 执行 native-test.mjs：通过。
- Codex/Claude Skill 镜像和生成的项目 MCP 配置：通过。
- Start 自检 localBridge、mcpProtocol：ready；browserConnection 和 aiClientConnection：not-verified。

本机包 SHA256：6C432B9A9CF2CEA5DA2AF708D68E18507C98A9427E455B70D2596EAF11588310。GitHub Actions 重新构建的 ZIP 字节可能不同，以发行页各自校验文件为准。

没有把本记录当作另一台物理电脑、真实浏览器加载、真实客户端、保存、发布或前端动作验证。原参数模型工程全量回归未在本次运行；施工图子项目独立回归已执行。

