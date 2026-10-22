# MathLab

MathLab 是一款仅在个人电脑运行的数学学习工作台。第一阶段围绕人教 A 版高中数学的知识目录、个人笔记和学习进度建立可靠基础。教材和教辅仍承担学习与练习；本应用用于整理与回顾自己的知识体系。

## 四个模块

| 模块 | 当前状态 | 方向 |
| --- | --- | --- |
| 数学知识库 | 已可用 | 浏览目录、搜索知识点、编辑 Markdown/LaTeX 笔记、记录学习状态 |
| 数学建模实验室 | 规划中 | 2D/3D 构造、GeoGebra、模型文件与模板 |
| 数学知识网络 | 规划中 | 知识关系与可视化探索 |
| 练习统计与能力树 | 规划中 | 教辅练习、作答、错因、能力证据和统计看板 |

后三个模块的页面用于说明规划，当前没有模型编辑或练习录入功能。

## 技术栈与目录

- 前端：React 19、TypeScript、Vite 6、React Router 7、Tailwind CSS 4、Radix UI Tooltip、KaTeX。
- 后端：Python 3、FastAPI、Pydantic 2、SQLAlchemy 2、SQLite。
- `frontend/src/modules/`：页面与模块；`frontend/src/services/`：API 客户端；`frontend/src/layouts/`：全局工作区。
- `backend/api/`：HTTP 接口；`backend/services/`：课程同步；`backend/database/`：模型与会话；`backend/schemas/`：接口类型。
- `curriculum/high_school/`：可提交的课程种子 JSON。
- `data/`：本机运行数据库；`resources/models/` 和 `resources/attachments/`：未来用户文件。三者内容均被 Git 忽略。
- `scripts/`：本地启动与数据库初始化；`docs/`：架构和课程数据说明。

## macOS 开发环境

推荐 macOS ARM64、Node.js 20.19+ 或 22.12+、npm 10+、Python 3.11+。开发机器使用 Node.js 24 与 Python 3.14 验证。所有服务默认仅绑定 `127.0.0.1`。

在项目根目录安装依赖：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
cd frontend && npm install && cd ..
```

初始化或更新课程数据：

```bash
.venv/bin/python -m scripts.init_db
```

重复初始化不会重复创建课程记录，也不会修改笔记或学习状态。首次启动后端时也会自动初始化。

启动两个服务：

```bash
bash scripts/dev.sh
```

浏览器打开 <http://127.0.0.1:5174>。在运行脚本的终端按 `Control-C` 停止两个服务。如需分别启动：

```bash
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend
cd frontend && npm run dev
```

后端 API 文档位于 <http://127.0.0.1:8000/docs>。Vite 将 `/api` 请求转发至本机后端。

## 数据保存与备份

默认 SQLite 文件为 `data/mathlab.sqlite3`。可在启动前设置 `MATHLAB_DATABASE_PATH` 指向另一个本机位置。关闭服务、刷新浏览器或重新启动电脑后，数据库文件中的笔记和状态仍保留。最近访问和主题偏好存放在该浏览器的 localStorage。备份个人数据时复制 SQLite 文件及未来的 `resources/` 文件；这些文件不会进入 Git。

## 当前课程数据范围

用户提到的《MathLab 高中数学知识大纲与能力框架 V0.2.docx》未在工作区找到。当前种子包含五册、18 章的暂定章名；第一章录入 3 个小节和 5 个基础知识节点，用于验证完整流程。章名仍需与该大纲逐项核对，其他小节和节点待补齐。系统不会用虚构条目填充空章节。详见 [课程数据说明](docs/curriculum.md)。

## 验证

```bash
.venv/bin/python -m pytest backend/tests -q
cd frontend && npm run typecheck && npm run build
```

后端测试覆盖目录、搜索、详情、状态、笔记、错误响应、重复初始化及重启后读取。前端构建执行严格 TypeScript 检查。

## 后续路线

1. 拿到课程大纲文档后核对 18 章及全部小节，逐步补入稳定 ID 的知识节点。
2. 引入 Alembic 迁移流程，并完善知识内容区块与附件管理。
3. 定义知识关系实体并实现知识网络浏览。
4. 加入模型文件管理和 GeoGebra 工作区。
5. 建立教辅、练习、作答与能力证据流程，再接入统计看板。
