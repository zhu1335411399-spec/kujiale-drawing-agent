# 工具入口

同一施工图 MCP 服务注册多个工具。实际 tools/list 和 [能力分组](capabilities.md) 共同用于确认当前部署，不以文件存在推断已连接。

| 任务 | 工具 | 参考 |
|---|---|---|
| 页面与配置定位 | drawing_get_context、drawing_read_config | [账号及配置流程](workflow.md) |
| 当前页线样式读取 | drawing_list_line_styles | [线样式合同](line-styles.md) |
| 四类注释与配色只读识别 | drawing_inspect_style_settings | [分类字段与规则](annotation-styles.md) |
| 注释样式搜索与新建 | drawing_search_annotation_styles、drawing_create_annotation_style | [业务流程与实测边界](annotation-write.md) |
| 注释改名/文本字号与保存 | drawing_update_annotation_style、drawing_save_annotation_styles | 分类、原值和回执绑定，实际结果逐项验收 |
| 网页名称搜索 | drawing_search_line_styles | [搜索编辑流程](line-style-edit.md) |
| 指定线样式编辑 | drawing_update_line_style | 原值快照与 ID 绑定，未保存 |
| 保存编辑回执 | drawing_save_line_style | 客户确认、保存反馈及刷新回读 |
| 新建线样式草稿 | drawing_create_line_draft | [新建流程](line-style-create.md) |
| 载入客户 | drawing_load_customer_config | [载入流程](customer-load.md) |
| 前端头像账号核对 | drawing_read_frontend_identity | [显示身份](frontend-identity.md) |
| 通用保存、发布 | drawing_save_config、drawing_publish_config | 仅目标核对，返回未执行 |

前端更新配置、自动标注、另存为、出图和恢复尚无已验证的自动执行工具。线样式引用读取、复制、删除和批量导入仍待适配。接口研究及实验工具不作为日常工作流入口。

