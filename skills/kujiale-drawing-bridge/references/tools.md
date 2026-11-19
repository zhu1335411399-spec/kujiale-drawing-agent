# 工具入口

同一施工图 MCP 服务注册多个工具。实际 tools/list 和 [能力分组](capabilities.md) 共同用于确认当前部署，不以文件存在推断已连接。

| 任务 | 工具 | 参考 |
|---|---|---|
| 页面与配置定位 | drawing_get_context、drawing_read_config | [账号及配置流程](workflow.md) |
| 对象大类/真分类/属性和显示样式读取 | drawing_inspect_object_config | [对象配置合同](object-config.md) |
| 指定对象属性编辑 | drawing_update_object_properties | 三属性原值、继承模式、真分类 ID 绑定 |
| 对象线样式引用替换 | drawing_replace_object_line_style | 浅深主题、原单元格、完整候选分页与唯一名称 |
| 对象回执保存 | drawing_save_object_config | 客户确认、保存时间更新、刷新并重载原客户回读 |
| 前端固定入口导航 | drawing_frontend_navigation | 仅打开图纸菜单、施工图工作区和设置；不切换模板或更新配置 |
| 前端图纸结构只读识别 | drawing_inspect_frontend_drawing | 不能代替账号、模板或生效验收 |
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
| 前端账号及工作区状态 | drawing_read_frontend_account | 普通设计端可读账号；共享缓存，明确 refresh 才重测 |
| 通用保存、发布 | drawing_save_config、drawing_publish_config | 仅目标核对，返回未执行 |

前端更新配置、自动标注、另存为、出图和恢复尚无已验证的自动执行工具。线样式复制、删除和批量导入仍待适配；对象引用的局部验证不代表其他分类的引用已支持。接口研究及实验工具不作为日常工作流入口。

