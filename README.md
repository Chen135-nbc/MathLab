# MathLab

MathLab 是个人数学笔记和建模工作台。它从人教 A 版高中数学起步，支持按自己的兴趣记录证明、反例和应用，在同一知识点积累中英德资料，并通过二维模型探索函数和参数。

- **Math Notes**：浏览教材册次、章节和小节，自主新建、改名、排序、移动和归档知识点，并保留小节自由笔记；编辑 Markdown 笔记，实时预览标题、列表、表格、链接和 LaTeX。可选择基础知识、拓展知识、进阶预览或个人研究，并为同一知识点保存多语言术语、定义、常见表达、语料及来源。
- **Mind Map**：独立创建树状导图，编辑、移动、折叠节点，保存、复制与导入导出。节点可关联已有知识卡或整理为新卡，知识卡可定位返回相关节点。
- **Math Studio**：独立新建二维函数模型，使用参数滑块、缩放和平移探索曲线。保存、重开或修改名称时，表达式、参数范围和值、视图、说明与时间会一起保留。模型可以关联多个知识点；在笔记和模型之间可双向跳转。

## 在 Mac 上运行

需要 Node.js 20.19+ 或 22.12+、npm 和 Python 3.11+。建议使用 Node.js 24，以便同时运行绘图测试。首次安装依赖时，在项目根目录运行：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
```

如果之前已经安装过 MathLab，只需执行 `npm --prefix frontend ci` 更新前端依赖，然后在项目根目录启动：

```bash
bash scripts/dev.sh
```

待后端显示 `Application startup complete`、Vite 显示 `ready` 后，打开 <http://127.0.0.1:5174/>。保留终端窗口，按 `Control-C` 停止。若提示 `5174` 或 `8000` 被占用，先打开上述地址确认是否已有 MathLab 实例；若要重新启动，在原终端停止旧实例再运行脚本。两个服务默认仅绑定回环地址。

也可在两个终端分别启动，Windows 上可将 Python 命令里的 `.venv/bin/python` 换成 `.venv\Scripts\python.exe`：

```bash
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend
npm --prefix frontend run dev
```

后端 API 文档位于 <http://127.0.0.1:8000/docs>。Vite 将 `/api` 转发给本机后端。

## LaTeX 公式助手

Math Notes 新增「LaTeX 使用手册」和笔记区「Σ 数学公式」。支持 9 类共 56 个条目的检索、复制、模板编辑、实时预览与光标插入；操作说明和测试见 [公式助手说明](docs/latex-assistant.md)。使用原有依赖和保存接口，无需重新初始化数据库。

## 数据保存与备份

笔记、分类、多语言资料、模型和思维导图都保存在 `data/mathlab.sqlite3`。P2 首次启动会先备份旧库至同目录 backups/，再增建所需数据表，保留原有笔记和知识点 ID。手动初始化或重新导入课程种子可运行 `.venv/bin/python -m scripts.init_db`，重复初始化不会覆盖个人资料。

可在启动前设置 `MATHLAB_DATA_DIR` 指定数据目录（文件名仍为 `mathlab.sqlite3`），或用优先级更高的 `MATHLAB_DATABASE_PATH` 指定完整文件路径。配置新位置不会自动复制旧数据。迁移或备份时，请先停止写入数据库，再保存 SQLite 文件；不要让两台机器同时写入移动盘上的同一个数据库。默认运行数据、附件和模型目录由 Git 忽略；自定义目录建议放在项目之外。最近访问和主题偏好仍存于浏览器。

课程种子维持五册、18 章的待核对框架；目前第一章录入 3 个小节。旧库的 5 个知识节点继续保留，新安装不再强制预置知识点。其余小节需要依据原始大纲补齐，详见 [课程数据说明](docs/curriculum.md)。

## P2 工作台

自定义知识点、小节笔记、Mind Map、导入导出、数据备份及迁移验证见 [P2 使用与架构说明](docs/p2-workspace.md)。新功能需要先执行一次 `npm --prefix frontend ci` 安装画布依赖。

## 手动验证

1. **Math Notes**：进入一个小节并新建知识点（旧库也可打开「集合与元素」），输入标题、列表、表格、链接和 `$a\in A$`，检查并排预览。切换内容分类，添加英文术语 `set` 并填写来源。保存后刷新，确认正文、分类、条目与时间仍在。
2. **Math Studio**：从主导航打开，填写模型名称和 `a*sin(x)+b`。用「添加 a」「添加 b」建立参数，拖动滑块，缩放、平移坐标系。保存后从模型库重新打开，确认参数和视图恢复；修改模型名称，再次保存。
3. **双向关联**：在模型中关联至少两个知识点并保存。在其中一张笔记的「相关模型」中打开它，然后点「返回原知识点」。也可以直接从笔记新建模型，来源知识点会预选。

```bash
.venv/bin/python -m pytest backend/tests -q
npm --prefix frontend test
npm --prefix frontend run build
```

`npm test` 需要支持 TypeScript 类型擦除的 Node.js（22.13+，推荐 24）。

## 实现与范围

前端沿用 React、TypeScript、Vite、React Router、Tailwind 和 KaTeX；新增 `remark-gfm` 渲染 Markdown 表格。二维绘图使用 SVG 和受限表达式语法，仅支持单值实函数 `y=f(x)`；三角函数使用弧度，乘法需写 `*`。模型保存在 SQLite 中，暂不提供单独文件的导入或导出。

后端沿用 FastAPI、Pydantic 和 SQLAlchemy。详见 [架构说明](docs/architecture.md)。下一阶段优先补齐课程清单、完善资料附件与数据备份，并按实际需求加入多曲线、参数方程或几何构造。三维、完整知识图谱、NotebookLM API、练习评价和在线部署不在本轮范围内。
