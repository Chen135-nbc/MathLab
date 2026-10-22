# MathLab 架构说明

## 本地运行边界

前端 Vite 与 FastAPI 是两个独立进程，默认分别监听 `127.0.0.1:5174` 和 `127.0.0.1:8000`。前端只通过 `/api` 请求读写课程与学习数据。SQLite 位于本机 `data/`，不提供账户、同步或外网访问能力。

## 数据边界

`curriculum/high_school/renjiao_a_2019.json` 是可版本控制的课程种子。`Volume → Chapter → Section → KnowledgePoint` 构成教材目录及其关联的知识节点，其中目录实体与知识节点分表保存。各 ID 稳定，不由标题推导。`LearningProgress` 和 `Note` 以知识点 ID 为主键，属本机个人数据。课程同步按 ID 更新课程字段，只插入或修改目录与知识点，不删除个人记录，也不触碰笔记和状态。

当前数据库记录 `schema_versions` 的初始版本 1。第一阶段只有初始建表；今后的结构变更应引入 Alembic 迁移，避免直接依赖 `create_all` 修改已有表。发布新课程种子前应检查 ID 不变与删除影响。

## API 与前端组织

`backend/api` 做路由、参数校验和 HTTP 错误；`backend/services` 负责课程同步；`backend/database` 定义持久化模型；`backend/schemas` 定义外部响应。前端 `services/api.ts` 统一请求、类型和错误处理。知识库模块负责目录、详情与笔记，其他模块是独立页面入口。

## 未来实体

- `Relation`：以 `source_point_id` 和 `target_point_id` 连接两个知识点，并保存关系类型（前置、推导、等价、推广、应用等）。
- `Model`：以模型 ID 管理本地文件；可通过知识点 ID 建立多对多关联。
- `Exercise`：记录教辅书、题号和题型，以知识点 ID 关联；`Attempt` 引用练习 ID，记录作答与错因。
- `Skill`：描述能力树节点；`SkillEvidence` 引用能力 ID、知识点 ID 和可选作答 ID，保留证据来源。学习状态与能力评价分离。

知识拓展导入未来先进入待审核数据区，再由用户确认归属知识点 ID。第一阶段不连接 AI 服务。
