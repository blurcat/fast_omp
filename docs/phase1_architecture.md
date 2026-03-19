# 运维中台一期系统 - 架构设计与模块说明

## 1. 后端总体架构设计

采用**分层架构（Layered Architecture）与模块化单体（Modular Monolith）**相结合的设计模式，所有业务跑在单一 FastAPI 进程中，通过路由模块化划分业务边界。

### 核心分层

| 层次 | 说明 |
|------|------|
| **接入层（Interface Layer）** | FastAPI Routers，负责参数校验（Pydantic）、路由分发、HTTP 状态码语义 |
| **数据访问层（DAL Layer）** | SQLAlchemy 异步 ORM，直接在路由函数中封装 DB 操作（当前无独立 Service 层） |
| **模型层（Model Layer）** | SQLAlchemy Models（DB Schema）和 Pydantic Schemas（DTO） |
| **基础设施层（Infrastructure Layer）** | 通用组件：JWT 认证、密码哈希、审计日志、Loguru 日志、配置管理 |

### 关键组件交互

1. **网关**：Nginx（Docker 部署时）→ FastAPI（应用层）。
2. **鉴权**：全局依赖注入（`get_current_user` / `get_current_active_user` / `get_current_superuser`），基于 JWT + RBAC 控制权限。
3. **数据存储**：PostgreSQL 存储全部业务数据；Redis 已集成（供 Celery 任务队列使用，当前未启用异步任务）。

---

## 2. 已实现模块

### 2.1 系统核心模块（`system`）

| 子模块 | 说明 |
|--------|------|
| **IAM** | 用户管理、角色管理、菜单管理（树形结构、动态权限过滤） |
| **Auth** | JWT 登录认证（OAuth2 密码流），Token 有效期 30 分钟 |
| **Audit** | 操作审计日志，覆盖所有写操作、登录事件、权限变更 |

### 2.2 资产中心模块（`cmdb`）

| 子模块 | 说明 |
|--------|------|
| **Resource** | 资产增删改查，支持多类型（host/database/middleware/k8s 等）和多云厂商 |
| **ResourceGroup** | 资产分组管理，多对多关联关系 |
| **ResourcePermission** | 用户级资源权限（read/write），支持直接授权和分组授权 |
| **Stats** | 资产统计概览（按类型/云厂商/状态分布） |

---

## 3. 规划中模块（未实现）

以下模块在原始设计中规划，当前版本（v1.1.0）尚未实现：

| 模块 | 说明 |
|------|------|
| **portal（运维门户）** | 公告通知、个人工作台快捷入口 |
| **ops（运维操作）** | WebSSH 在线终端、K8S Console、脚本执行 |
| **monitor（监控聚合）** | 告警 Webhook 接收、日志查询代理（对接 ELK/Loki） |
| **Cloud Sync** | 多云资产自动同步（阿里云/AWS/腾讯云 SDK） |

---

## 4. 项目目录结构（实际）

```
fast_omp/
├── app/
│   ├── api/
│   │   ├── deps.py             # 依赖注入（认证、权限）
│   │   └── v1/
│   │       ├── api.py          # 路由汇总
│   │       ├── system/         # 系统管理接口
│   │       │   ├── auth.py
│   │       │   ├── users.py
│   │       │   ├── roles.py
│   │       │   ├── menus.py
│   │       │   └── audit.py
│   │       └── cmdb/           # 资产接口
│   │           ├── resources.py
│   │           ├── groups.py
│   │           ├── permissions.py
│   │           └── stats.py
│   ├── core/
│   │   ├── config.py           # Pydantic Settings 配置
│   │   ├── security.py         # JWT、密码哈希
│   │   ├── database.py         # AsyncSession、Base
│   │   └── audit.py            # 审计日志工具函数
│   ├── models/
│   │   ├── base.py             # Base、TimestampMixin
│   │   ├── system.py           # User、Role、Menu
│   │   ├── cmdb.py             # Resource、ResourceGroup、ResourcePermission
│   │   └── audit.py            # AuditLog
│   ├── schemas/
│   │   ├── system.py
│   │   ├── cmdb.py
│   │   └── audit.py
│   ├── initial_data.py         # 初始化管理员和菜单数据
│   └── main.py                 # FastAPI 应用入口
├── alembic/                    # 数据库迁移脚本
├── web/                        # React 前端应用
├── .env.example                # 环境变量配置模板
├── .gitignore
├── CHANGELOG.md                # 版本变更记录
├── DEPLOY.md                   # 部署文档
├── docker-compose.yml
├── Dockerfile
├── requirements.txt            # Python 依赖（pip）
└── README.md
```

---

## 5. 核心技术选型说明

| 组件 | 选型 | 理由 |
|------|------|------|
| **Web 框架** | FastAPI | 高性能异步、自动生成 OpenAPI 文档、Pydantic 类型安全 |
| **ORM** | SQLAlchemy 2.x | 全异步支持（AsyncIO），类型提示友好，功能强大 |
| **数据库** | PostgreSQL 15 | 支持 JSONB（适合 CMDB 半结构化数据），扩展性强 |
| **迁移工具** | Alembic | SQLAlchemy 官方配套，版本控制 Schema 变更 |
| **任务队列** | Celery + Redis | 已集成依赖，供后续异步任务（多云同步等）使用 |
| **认证授权** | JWT（HS256）| 无状态认证，适合前后端分离架构 |
| **依赖管理** | pip + requirements.txt | 当前环境使用，后续可迁移至 uv 或 Poetry |
