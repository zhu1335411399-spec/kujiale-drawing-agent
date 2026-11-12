# 页面与接口

来源为 2026-11-10 酷家乐已登录页面和只读导航期间实际观察到的请求。页面根路径为 `https://www.kujiale.com/pub/saas/workbench/construction/drawing_config/`。API 路径同源。按任务只读所需小节。

## 页面路由

| 分组 | 功能 | 根路径后的后缀 |
|---|---|---|
| 素材库 | 标准图纸、图框、大样、图例、符号、填充 | `company/page`、`company/frame`、`company/detailview`、`company/legend`、`company/symbol`、`company/hatch` |
| 施工图设置 | 图例应用、定制图纸设置、通用出图设置 | `config/legendApply`、`company/custom-page`、`company/common-drawings-config` |
| 施工图模板 | 模板管理、按部门应用 | `company/templateSetting`、`company/Department-Application` |
| 基础配置 | 样式、对象、注释、视图、表格、图纸、下载、参数、页面、其他、历史版本 | 在 `config/` 后依次拼接 `style`、`object`、`comment`、`view`、`table`、`page`、`download`、`parameter`、`ui`、`other`、`history` |

区分 `company/page` 的企业标准图纸素材和 `config/page` 的基础图纸配置。样式页已见通用设置、线样式、注释样式。历史页区分保存版本与发布版本，支持选中版本对比。模板页已见基础配置、创建部门、可用部门与管理权限字段。

## 已观察的业务请求

| 导航场景 | 方法和路径 | 查询参数名 |
|---|---|---|
| 多页初始化 | GET `/construction-cms/api/basicConfig/get` | `create` |
| 多页初始化 | GET `/construction-cms/api/net-config/setting` | `newest`、`basicConfigId` |
| 多页初始化 | POST `/construction-cms/api/net-config/list/v1` | 未见 URL 查询参数 |
| 多页初始化 | GET `/dcs-drawing/site/api/open/config/full/get` | `obsRootConfigId` |
| 历史版本 | GET `/construction-cms/api/net-config/history` | `basicConfigId`、`publishedStatus` |
| 模板管理、按部门应用 | GET `/construction-cms/api/templates` | 未见 |
| 按部门应用 | GET `/construction-cms/api/node/templates` | `nodeId` |
| 按部门应用 | GET `/bp/api/org-tree-node/branch` | 未见 |
| 标准图纸库 | GET `/construction-cms/api/enterprise/config` | `configClass` |

表中请求均观察到 HTTP 200。这里只记录导航场景、方法、路径和查询键，参数值、POST 请求体、业务返回结构和写入合同仍待验证。尤其不要根据 GET 方法或 `create` 字段名推断可以安全重放。

## 补测方式

在当前施工图标签页开始采集，再打开一个目标菜单或刷新目标页。结束后按来源页面、请求方法、去重路径、查询键、状态和次数汇总。先用上表排除初始化噪声。若切换菜单没有发出独立请求，记录页面入口已验证、业务请求未定位。附带扩展只检查两类页面访问状态，接口补查使用浏览器网络面板。

