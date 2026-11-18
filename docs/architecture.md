# MathLab 架构说明

## 运行与数据边界

Vite 和 FastAPI 默认分别监听 `127.0.0.1:5174` 与 `127.0.0.1:8000`；浏览器通过同源 `/api` 访问服务。SQLite 路径由 `pathlib` 与 SQLAlchemy URL 处理，支持 `MATHLAB_DATA_DIR` 和 `MATHLAB_DATABASE_PATH`。不依赖 macOS 专属服务，开发启动脚本之外可用标准 Python 与 npm 命令运行。

课程种子独立于个人数据。`Volume → Chapter → Section → KnowledgePoint` 仍用原有稳定 ID；种子重载只更新课程字段。`Note` 与 `LearningProgress` 仍按知识点 ID 保存。本次升级标记版本 2，通过 `create_all` 增建以下表，无需修改旧表结构：

| 表 | 作用 |
| --- | --- |
| `note_profiles` | 按知识点 ID 保存一项内容分类以及多语言条目。每条包括语言代码、类型、正文和来源；同一概念无需复制知识节点。 |
| `studio_models` | 以 UUID 保存名称、表达式、参数、视图、说明及创建和修改时间。参数与视图使用带校验的 JSON。 |
| `studio_model_points` | 模型与知识点的多对多关系，两个方向都使用数据库外键校验。 |

笔记正文与可选档案通过原 `PUT /api/knowledge/{id}/note` 一次保存，旧客户端只提交正文时保留档案。模型通过 `GET/POST /api/models` 与 `GET/PUT /api/models/{id}` 读取和保存，列表可按 `point_id` 筛选。一次保存同时更新模型与关联。用户编辑时间按 UTC 存储，界面使用浏览器本地时区展示。若未来修改既有表，应该引入显式版本迁移。

## 前端

Math Notes 复用目录、知识点详情、Markdown 和 KaTeX。它将当前草稿实时送入预览，保存后写入本机数据库。外部链接由用户点击打开；预览不会自动载入远程图片。本轮没有附件上传。

Math Studio 的表达式模块通过有限长度的词法和递归下降解析构建数值函数，变量通过参数 Map 取值，函数和常量来自白名单，不执行任意代码；API 存储表达式文本，不在服务器运行表达式。绘图区按视口像素采样，以有限值和中点检查断开常见不连续区域；极窄振荡或奇点仍可能被采样遗漏。坐标中心与单位像素比例作为视图数据一起保存。

`/knowledge/:pointId` 与 `/modeling/:modelId?` 分别对应笔记和模型页面。笔记进入模型时携带来源知识点 ID，返回链接在页面刷新后仍有效。从笔记新建会默认选中该知识点，保存后才能在两边看见此关联。旧图谱、练习路由保留作为历史入口，主导航仅展示 P1 模块。
