# 施工图 MCP

真实代码：[mcp 源码](.)。入口 native-server.mjs --stdio，浏览器以 Native Messaging 连接本机 IPC 服务，无手工配对码。

三个只读工具：drawing_get_context、drawing_read_config、drawing_list_line_styles。

独立写入入口：drawing_save_config、drawing_publish_config。当前适配器未验证，只读取并核对目标，返回 executed:false；不执行写入。发布不由保存串联触发。

源代码定义为当前合同权威来源；contracts.json 为归档说明，扩展工具时同步维护。diagnose.mjs 只做服务和工具清单检查，不能代替浏览器、AI 客户端或业务验证。

