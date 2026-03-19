# Ops Middle Platform (fast_omp)

现代化运维中台管理系统，提供统一的资产管理（CMDB）、权限控制（RBAC）和操作审计功能。前后端分离架构，基于 FastAPI 和 React (Ant Design Pro) 构建。

## 主要功能

- **权限管理 (RBAC)** — 用户、角色、菜单三级权限体系，支持动态菜单和细粒度权限分配
- **资产管理 (CMDB)** — 多云/多类型资产全生命周期管理，支持资产分组与分组级权限控制
- **审计日志** — 全量操作记录，覆盖登录、增删改查、权限变更，记录操作人、IP 和详情
- **仪表盘** — 资产总量及按类型、云厂商、状态的分布统计

## 技术栈

| 层次 | 技术 |
|------|------|
| 后端框架 | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12) |
| 数据库 | [PostgreSQL](https://www.postgresql.org/) 15 |
| ORM | [SQLAlchemy](https://www.sqlalchemy.org/) 2.0 (异步) |
| 缓存 | [Redis](https://redis.io/) 7 |
| 认证 | JWT (HS256) |
| 迁移 | Alembic |
| 前端框架 | [React](https://react.dev/) 19 + TypeScript |
| 构建工具 | [Vite](https://vitejs.dev/) |
| UI 组件 | [Ant Design Pro](https://procomponents.ant.design/) |
| 状态管理 | Redux Toolkit |
| 容器化 | Docker Compose |

## 快速开始

详细部署步骤请参考 [DEPLOY.md](./DEPLOY.md)。

### 本地开发

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，填写数据库密码和 SECRET_KEY

# 2. 后端
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python app/initial_data.py   # 创建默认管理员
python -m app.main           # 启动，监听 :8000

# 3. 前端（新终端）
cd web && npm install && npm run dev  # 监听 :5173
```

### Docker 部署

```bash
# 1. 配置环境变量（必须）
cp .env.example .env
# 编辑 .env，至少设置 POSTGRES_PASSWORD 和 SECRET_KEY

# 2. 一键启动
docker-compose up -d --build
```

访问地址：前端 http://localhost · API 文档 http://localhost:8000/docs

### 默认管理员账号

| 字段 | 值 |
|------|-----|
| 用户名 | 由 `.env` 中 `FIRST_SUPERUSER` 决定，默认 `admin` |
| 密码 | 由 `.env` 中 `FIRST_SUPERUSER_PASSWORD` 决定 |

> **安全提示**：请在 `.env` 中设置强密码（≥8位）。密码一旦通过 `initial_data.py` 写入数据库，修改 `.env` 不会自动同步，需登录后在用户管理中手动修改。

## 项目结构

```
fast_omp/
├── app/                    # 后端应用
│   ├── api/v1/             # API 路由（system/ + cmdb/）
│   ├── core/               # 配置、数据库、安全、审计
│   ├── models/             # SQLAlchemy 数据模型
│   └── schemas/            # Pydantic 验证模型
├── web/                    # 前端应用（React）
│   └── src/
│       ├── pages/          # 页面组件
│       ├── services/       # API 调用层
│       ├── store/          # Redux 状态
│       └── types/          # TypeScript 类型定义
├── alembic/                # 数据库迁移脚本
├── .env.example            # 环境变量配置模板
├── CHANGELOG.md            # 版本变更记录
├── DEPLOY.md               # 详细部署文档
├── docker-compose.yml      # Docker 编排文件
└── requirements.txt        # Python 依赖
```

## 变更记录

详见 [CHANGELOG.md](./CHANGELOG.md)。

## License

MIT License
