# 运维中台一期系统 - 架构与任务拆解

## 1. 后端总体架构设计

采用 **分层架构 (Layered Architecture)** 与 **模块化单体 (Modular Monolith)** 相结合的设计模式。

### 核心分层
*   **接入层 (Interface Layer)**: FastAPI Routers。负责请求参数校验 (Pydantic)、路由分发、统一响应格式封装。
*   **业务逻辑层 (Service Layer)**: 核心业务逻辑。处理复杂的业务规则、跨模块调用、事务控制。
*   **数据访问层 (Repository/DAL Layer)**: 封装数据库操作。使用 SQLAlchemy ORM，将 DB 操作与业务逻辑解耦。
*   **模型层 (Model Layer)**: SQLAlchemy Models (DB Schema) 和 Pydantic Schemas (DTO)。
*   **基础设施层 (Infrastructure Layer)**: 通用组件。包括 Redis 缓存、Celery 异步任务、日志 Loguru、异常处理、工具类。

### 关键组件交互
1.  **统一网关**: Nginx (部署时) -> FastAPI (应用层)。
2.  **异步任务**: 耗时操作（如 K8S 资源同步、多云资产拉取）通过 Celery + Redis 异步执行。
3.  **鉴权中心**: 全局依赖注入 (Dependency Injection) 实现 `get_current_user`，基于 JWT + RBAC (Role-Based Access Control) 控制权限。
4.  **数据存储**: PostgreSQL 存储核心业务数据；Redis 存储 Session、Cache、Celery Broker。

---

## 2. 模块边界划分

根据一期目标，将系统拆分为以下核心模块：

### 2.1 系统核心模块 (`system`) - **基础底座**
*   **IAM (Identity & Access Management)**: 用户管理、角色管理、权限菜单管理、部门/组织架构。
*   **Auth**: 登录认证 (JWT)、刷新 Token、OAuth2 集成预留。
*   **Audit**: 操作审计日志（记录谁、在什么时间、操作了什么接口、参数是什么）。

### 2.2 资产中心模块 (`cmdb`) - **CMDB v1**
*   **Resource Model**: 资产模型定义（主机、数据库、K8S集群、网络设备等）。
*   **Asset Inventory**: 资产实例数据的增删改查。
*   **Cloud Sync**: 多云资源同步适配器（阿里云/AWS/腾讯云 SDK 集成）。
*   **Tag Management**: 标签管理（用于业务分组）。

### 2.3 运维门户模块 (`portal`) - **统一入口**
*   **Dashboard**: 首页概览（资产统计、告警概览、我的工单）。
*   **Notice**: 公告通知系统。
*   **Workplace**: 个人工作台（快捷入口配置）。

### 2.4 运维操作模块 (`ops`) - **作业执行**
*   **WebSSH**: 基于 WebSocket 的在线终端，连接主机或 K8S Pod。
*   **K8S Console**: K8S 资源查看与简单操作（Deployment, Pod, Service, Log）。
*   **Script Execution**: 简单脚本执行（Shell/Python）。

### 2.5 监控聚合模块 (`monitor`) - **可观测性**
*   **Alert Webhook**: 接收 Prometheus/Zabbix 告警。
*   **Log Proxy**: 日志查询代理（对接 ELK 或 Loki）。

---

## 3. 项目目录结构建议

```text
fast_mm/
├── app/
│   ├── api/                # 接口层 (Routers)
│   │   ├── v1/
│   │   │   ├── system/     # 系统管理接口
│   │   │   ├── cmdb/       # 资产接口
│   │   │   ├── ops/        # 运维操作接口
│   │   │   └── ...
│   │   └── api.py          # 路由汇总
│   ├── core/               # 核心配置与组件
│   │   ├── config.py       # Pydantic Settings 配置
│   │   ├── security.py     # JWT, Password Hash
│   │   ├── database.py     # DB Session, Base Model
│   │   ├── exceptions.py   # 自定义异常
│   │   └── response.py     # 统一响应结构
│   ├── models/             # 数据库模型 (SQLAlchemy)
│   │   ├── system.py
│   │   ├── cmdb.py
│   │   └── ...
│   ├── schemas/            # 数据交互模型 (Pydantic)
│   │   ├── user.py
│   │   ├── asset.py
│   │   └── ...
│   ├── services/           # 业务逻辑层
│   │   ├── auth_service.py
│   │   ├── asset_service.py
│   │   └── ...
│   ├── tasks/              # Celery 异步任务
│   │   ├── cmdb_sync.py
│   │   └── ...
│   ├── utils/              # 工具类
│   └── main.py             # App 入口
├── alembic/                # 数据库迁移脚本
├── scripts/                # 运维脚本/启动脚本
├── tests/                  # 测试用例
├── .env                    # 环境变量
├── alembic.ini             # Alembic 配置
├── docker-compose.yml      # 本地开发环境编排
├── pyproject.toml          # 依赖管理
└── README.md
```

---

## 4. 核心技术选型说明

| 组件 | 选型 | 理由 |
| :--- | :--- | :--- |
| **Web 框架** | **FastAPI** | 高性能、原生异步支持、自动生成 OpenAPI 文档、类型安全（Pydantic），非常适合构建现代 RESTful API。 |
| **ORM** | **SQLAlchemy 2.x** | Python 界最强 ORM，2.0 版本全面支持异步 (AsyncIO)，类型提示更友好，功能强大且灵活。 |
| **数据库** | **PostgreSQL** | 强大的开源关系型数据库，支持 JSONB（对 CMDB 这种半结构化数据非常友好），扩展性强。 |
| **迁移工具** | **Alembic** | SQLAlchemy 官方配套迁移工具，版本控制数据库 Schema 变更。 |
| **任务队列** | **Celery + Redis** | 工业级标准。处理资产同步、批量运维等耗时任务。Redis 作为 Broker 和 Result Backend。 |
| **认证授权** | **JWT + OAuth2** | 无状态认证，适合前后端分离；OAuth2 协议标准，方便后续对接 LDAP 或企业微信/钉钉扫码登录。 |
| **WebSSH** | **WebSockets** | FastAPI 原生支持 WebSocket，配合 `paramiko` 或 `asyncssh` 实现浏览器端 SSH 终端。 |
| **依赖管理** | **Poetry / Pip** | 建议使用 Poetry 进行依赖锁定和环境管理（当前环境使用 pip 亦可）。 |

---

## 下一步行动建议
1.  **初始化项目骨架**：创建目录结构，配置 `pyproject.toml` 和 `.env`。
2.  **配置数据库环境**：编写 `docker-compose.yml` 启动 PostgreSQL 和 Redis。
3.  **实现基础核心**：完成 `core` 模块配置（DB 连接、Settings、Log）。
