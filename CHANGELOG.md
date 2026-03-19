# Changelog

所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [1.2.0] - 2026-03-19

### Bug 修复

#### [B-08] ALLOWED_ORIGINS 环境变量解析失败

**影响文件**: `app/core/config.py`

**问题**: `ALLOWED_ORIGINS: List[str]` 在 pydantic-settings v2 中被当作复杂类型，pydantic-settings 在调用任何 validator 之前就直接对环境变量值执行 `json.loads()`。当 `.env` 中使用逗号分隔格式（`http://localhost,http://localhost:5173`）时，JSON 解析失败，导致应用和 alembic 均无法启动。

**修复**:
- 将 `ALLOWED_ORIGINS: List[str]` 改为 `ALLOWED_ORIGINS: str`，彻底绕开 pydantic-settings 的 JSON 预处理。
- 在 `main.py` CORS 中间件使用处 split：`[o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]`。
- 将 `class Config` 迁移到 `SettingsConfigDict`（pydantic-settings v2 推荐写法），并加入 `extra="ignore"` 允许 `.env` 中存在未在 Settings 中定义的字段（如 `ALLOW_INSECURE_SECRET_KEY`）。

---

#### [B-09] bcrypt>=4.1 与 passlib 兼容性问题

**影响文件**: `requirements.txt`

**问题**: `passlib` 库（已停止维护）依赖 `bcrypt` 的 `__about__.__version__` 属性和旧的哈希行为，而 `bcrypt>=4.1` 删除了该属性，且对超过 72 字节的密码处理方式变化，导致 `get_password_hash()` 抛出 `ValueError`，无法创建或验证任何账户密码。

**修复**: 在 `requirements.txt` 中固定 `bcrypt==4.0.1`，该版本与 passlib 完全兼容。

**升级指引**: 重新安装依赖：`pip install "bcrypt==4.0.1"`，Docker 环境需 `--no-cache` 重新构建镜像。

---

### 前端修复

#### [F-04] 修复 15 处 TypeScript 编译错误导致 Docker 构建失败

**影响文件**: `web/src/` 下多个组件文件

**问题**: `npm run build`（`tsc -b && vite build`）因 TypeScript 严格模式报错，前端 Docker 镜像构建失败，无法完成 `docker-compose up --build`。

**修复清单**:

| 文件 | 错误类型 | 修复内容 |
|------|---------|---------|
| `BasicLayout.tsx` | TS2353 不存在的属性 | 移除不存在的 `colorTextMenuItemHover` token（重复行） |
| `store/slices/authSlice.ts` | TS6133 未使用导入 | 移除未使用的 `PayloadAction` 导入 |
| `pages/Dashboard/index.tsx` | TS6133 未使用变量 | 移除未使用的 `Statistic` 解构赋值 |
| `pages/Settings/AuditLogs/index.tsx` | TS6133 未使用导入 | 移除未使用的 `Tag` 导入 |
| `pages/Assets/Groups/index.tsx` | TS6133 + TS2554 | 移除未使用的 `Modal` 导入；`useRef<ActionType>()` 改为 `useRef<ActionType \| undefined>(undefined)` |
| `pages/Assets/index.tsx` | TS6133 未使用参数 | render 函数 `text` 参数改为 `_` |
| `pages/Settings/Menus/index.tsx` | TS6133 未使用参数 | render `text` 改为 `_`；request `params` 改为 `_params` |
| `pages/Settings/Permissions/index.tsx` | TS6133 + TS2554 | 移除未使用的 `DeleteOutlined` 导入；修复 `useRef` 缺少参数 |
| `pages/Settings/Roles/index.tsx` | TS6133 + TS2554 | 移除未使用的 `useEffect` 导入；修复 `useRef` 参数；render `text` 改为 `_` |
| `pages/Settings/Users/index.tsx` | TS6133 未使用参数 | render `text` 参数改为 `_` |

> **背景**: React 19 的 `useRef` 要求必须传入初始值参数；TypeScript 严格模式下未使用的声明会报错。将未使用参数改为以 `_` 开头可告知编译器该参数有意忽略。

---

#### [F-05] 修复 DEPLOY.md 初始化命令错误

**影响文件**: `DEPLOY.md`

**问题**: 文档中 `python app/initial_data.py` 命令在项目根目录执行时会报 `ModuleNotFoundError: No module named 'app'`，因为 Python 无法解析相对模块路径。

**修复**: 改为模块调用方式 `python -m app.initial_data`。

---

## [1.1.0] - 2026-03-18

### 安全修复

#### [S-01] SECRET_KEY 安全校验与 CORS 修复

**影响文件**: `app/core/config.py`, `app/main.py`

**问题**: `SECRET_KEY` 使用了硬编码的默认占位符字符串，部署时若未替换，JWT 签名密钥形同虚设。同时 CORS 配置 `allow_origins=["*"]` 与 `allow_credentials=True` 并存，违反 W3C 规范，且允许任意来源发送带凭据的跨域请求。

**修复**:
- `config.py` 新增 `ALLOWED_ORIGINS: List[str]` 配置项，通过环境变量控制允许的跨域来源。
- `config.py` 新增 `is_insecure_secret_key` 属性，用于检测是否仍在使用默认密钥。
- `main.py` 应用启动时（`lifespan`）检查 `SECRET_KEY`：若为默认值且未设置 `ALLOW_INSECURE_SECRET_KEY=true` 环境变量，则直接抛出异常拒绝启动。
- `main.py` CORS 中间件改为使用 `settings.ALLOWED_ORIGINS`，不再硬编码通配符。

**升级指引**: 部署前请在 `.env` 文件中设置强随机 `SECRET_KEY`（可用 `openssl rand -hex 32` 生成）及 `ALLOWED_ORIGINS`。

---

#### [S-02] HTTP 状态码语义修正

**影响文件**: `app/api/deps.py`, `app/api/v1/system/auth.py`

**问题**: 用户未激活和权限不足时均返回 `HTTP 400 Bad Request`，不符合 REST 语义规范。

**修复**:
- `deps.py` `get_current_active_user`：用户未激活改为返回 `HTTP 403 Forbidden`。
- `deps.py` `get_current_superuser`：权限不足改为返回 `HTTP 403 Forbidden`。
- `auth.py` 登录时用户未激活改为返回 `HTTP 403 Forbidden`。

---

#### [S-03] 资产分组接口补全认证依赖

**影响文件**: `app/api/v1/cmdb/groups.py`

**问题**: `GET /api/v1/asset-groups/` 和 `GET /api/v1/asset-groups/{group_id}` 两个接口缺少认证依赖，任何人无需登录即可访问所有资产分组数据。

**修复**: 两个接口均添加 `current_user = Depends(deps.get_current_active_user)` 认证依赖。

---

#### [S-04] ResourcePermission.user_id 外键约束缺失

**影响文件**: `app/models/cmdb.py`, `alembic/versions/a1b2c3d4e5f6_*.py`

**问题**: `cmdb_resource_permissions.user_id` 仅为普通整数列，缺少指向 `sys_users.id` 的外键约束，导致：
1. 可以为不存在的用户创建权限记录；
2. 删除用户时权限记录不会级联清理，产生孤立数据；
3. 数据库层面无法保证引用完整性。

**修复**:
- `models/cmdb.py` 将 `user_id` 改为 `mapped_column(ForeignKey("sys_users.id"), ...)`，并配置 `ondelete="CASCADE"`。
- 新增 Alembic 迁移文件 `a1b2c3d4e5f6`，为现有数据库表添加该外键约束。

**升级指引**: 执行 `alembic upgrade head` 应用新迁移。

---

#### [S-05] Docker 部署密码不再硬编码

**影响文件**: `docker-compose.yml`, `.env.example`（新增）, `.gitignore`（新增）

**问题**: `docker-compose.yml` 中 `POSTGRES_PASSWORD`、`SECRET_KEY` 等敏感信息直接硬编码，一旦代码仓库泄漏，凭据同步暴露。

**修复**:
- `docker-compose.yml` 所有敏感环境变量改用 `${VAR:?err}` 语法，未设置时 Docker Compose 启动报错而非使用空值或默认值。
- 新增 `.env.example`，提供完整的配置模板和说明。
- 新增 `.gitignore`，确保 `.env` 文件不被意外提交到代码仓库。

---

### Bug 修复

#### [B-01] 菜单树构建异步懒加载 Bug

**影响文件**: `app/api/v1/system/menus.py`

**问题**: `delete_menu` 接口中通过 `menu.children` 检查子菜单，直接访问 SQLAlchemy ORM 关联关系会在异步环境下触发懒加载，可能导致 `MissingGreenlet` 错误或返回错误结果。

**修复**: 改用独立的 SQL `COUNT` 查询检查子菜单数量：
```python
child_count_result = await db.execute(
    select(func.count(Menu.id)).where(Menu.parent_id == menu_id)
)
```

---

#### [B-02] 删除操作后访问已过期 ORM 属性

**影响文件**: `app/api/v1/system/menus.py`, `app/api/v1/system/roles.py`, `app/api/v1/cmdb/resources.py`, `app/api/v1/cmdb/groups.py`

**问题**: 所有删除接口均在 `await db.commit()` 之后访问被删除对象的属性（如 `role.name`、`menu.title`），而 SQLAlchemy 在 `commit` 后会使 ORM 对象属性过期，访问时触发 SELECT，但记录已删除，导致 `ObjectDeletedError` 或数据不一致。

**修复**: 在 `db.delete()` 和 `db.commit()` 执行**前**将所需字段保存到局部变量：
```python
# 正确做法：先保存
role_id_str = str(role.id)
role_name = role.name
# 再删除
await db.delete(role)
await db.commit()
# 使用保存的变量
await create_audit_log(..., details={"name": role_name})
```

---

#### [B-03] check_permission 逻辑错误

**影响文件**: `app/api/v1/cmdb/resources.py`

**问题**: 原 `check_permission` 函数中，判断直接权限时的逻辑混乱：
```python
# 原代码（有缺陷）
if perm:
    if required_perm == PermissionType.READ: return True  # 不检查实际权限级别
    if perm.permission == PermissionType.WRITE: return True
```
第一个分支在 `required_perm == READ` 时直接放行，而不检查用户实际持有的权限级别（用户可能只有 WRITE 权限但无 READ 记录），逻辑语义不清晰。

**修复**: 重写为语义明确的实现，将权限判断抽取为内部函数，WRITE 权限包含 READ：
```python
def has_required_perm(perm_level: PermissionType) -> bool:
    if required_perm == PermissionType.READ:
        return True  # 有任何权限记录均可读
    return perm_level == PermissionType.WRITE
```

---

#### [B-04] 角色删除未检查关联用户

**影响文件**: `app/api/v1/system/roles.py`

**问题**: 删除角色时未检查是否仍有用户绑定该角色，直接删除后这些用户的 `role_id` 变为悬空外键（由于 `nullable=True` 不报错），导致用户角色数据丢失。

**修复**: 删除前通过 SQL COUNT 检查关联用户数，若存在则拒绝删除并返回友好提示：
```
该角色下仍有用户，请先解除用户与该角色的关联
```

---

#### [B-05] 审计日志路由注册缺失 prefix

**影响文件**: `app/api/v1/api.py`, `app/api/v1/system/audit.py`

**问题**: `audit.router` 在注册时未设置 `prefix`，导致审计日志接口路径 `/audit/logs` 挂载在 API 根路径下（`/api/v1/audit/logs`），与其他模块路由风格不一致，且路由路径在 `audit.py` 内部写死了完整路径。

**修复**:
- `api.py` 注册时添加 `prefix="/audit"`。
- `audit.py` 路由路径从 `/audit/logs` 改为 `/logs`，最终路径保持 `/api/v1/audit/logs` 不变，符合路由组织规范。

---

#### [B-06] 重复的资产统计端点

**影响文件**: `app/api/v1/cmdb/resources.py`

**问题**: `resources.py` 中存在 `GET /assets/stats` 端点，与 `stats.py` 中的 `GET /stats/summary` 端点功能重叠，职责不清晰，维护成本翻倍。

**修复**: 删除 `resources.py` 中的 `/stats` 端点，统计功能统一由 `stats.py` 负责。

---

### 代码质量改进

#### [Q-01] 菜单树构建算法优化（O(n²) → O(n)）

**影响文件**: `app/api/v1/system/menus.py`

**问题**: 原 `build_menu_tree` 函数每次递归都完整遍历菜单列表，时间复杂度为 O(n²)。

**修复**: 改用 `defaultdict` 按 `parent_id` 预分组，时间复杂度降为 O(n)：
```python
children_map: Dict[Optional[int], List[Menu]] = defaultdict(list)
for menu in menus:
    children_map[menu.parent_id].append(menu)
```

---

#### [Q-02] 菜单查询下推至 SQL 层

**影响文件**: `app/api/v1/system/menus.py`

**问题**: 非超级管理员访问菜单时，原逻辑先加载全部菜单到内存，再在 Python 层按 `allowed_ids` 过滤，存在不必要的数据库读取开销。

**修复**: 直接在 SQL 层添加 `WHERE id IN (allowed_ids)` 过滤条件，减少数据库传输量。

---

#### [Q-03] 移除菜单树分页（语义错误）

**影响文件**: `app/api/v1/system/menus.py`

**问题**: 原代码对构建好的树形菜单结构的**顶级节点**做了 `skip/limit` 切片，树形结构分页语义不清晰（切掉顶级节点后子节点无父节点依托），且菜单数量通常极少，无分页必要。

**修复**: 移除 `skip`/`limit` 参数，菜单接口始终返回完整树结构。

---

#### [Q-04] 密码强度后端校验

**影响文件**: `app/schemas/system.py`

**问题**: `UserCreate.password` 字段无任何约束，绕过前端可以创建任意弱密码账户。

**修复**: 在 `UserCreate` 中添加 Pydantic `@field_validator`，要求密码长度不少于 8 位：
```python
@field_validator("password")
@classmethod
def password_strength(cls, v: str) -> str:
    if len(v) < 8:
        raise ValueError("密码长度不少于8位")
    return v
```

---

#### [Q-05] Pydantic Schema 类型规范化

**影响文件**: `app/schemas/system.py`, `app/schemas/cmdb.py`

**问题**:
- `RoleBase.permissions` 类型标注为裸 `dict`，缺少泛型参数。
- 多处使用 `= {}` 作为可变类型默认值，不够明确。

**修复**:
- `permissions` 改为 `Dict[str, Any] = Field(default_factory=dict)`。
- `ResourceBase` 的 `data` 和 `tags` 字段改为 `Field(default_factory=dict)`。

---

#### [Q-06] security.py 类型标注修正

**影响文件**: `app/core/security.py`

**问题**: `create_access_token` 函数签名 `expires_delta: timedelta = None` 类型不正确，`None` 不是 `timedelta` 类型。

**修复**: 改为 `expires_delta: Optional[timedelta] = None`。

---

#### [Q-07] 统一日志库

**影响文件**: `app/initial_data.py`

**问题**: `initial_data.py` 使用标准库 `logging`，与项目其他模块使用的 `loguru` 不统一，日志格式不一致。

**修复**: 改为 `from loguru import logger`。

---

#### [Q-08] 清理 deps.py 遗留代码

**影响文件**: `app/api/deps.py`

**问题**: `# ... imports ...` 占位符注释和错位的 `from sqlalchemy.orm import selectinload` 导入（位于函数定义中间而非文件顶部）。

**修复**: 删除无意义注释，将 `selectinload` 导入移至文件顶部，符合 PEP 8 规范。

---

### 前端改进

#### [F-01] 修复废弃 API 警告

**影响文件**: `web/src/pages/Assets/Groups/index.tsx`

**问题**: `ModalForm` 使用了 Ant Design 5.x 已废弃的 `visible` 和 `onVisibleChange` 属性，控制台会持续输出废弃警告。

**修复**: 改为新版 API `open` 和 `onOpenChange`。

---

#### [F-02] 补全 TypeScript 类型定义

**影响文件**: `web/src/types/index.ts`

**问题**: `Resource` 接口缺少 `groups` 字段，与后端 `ResourceResponse` 返回的数据结构不符，导致前端访问 `resource.groups` 时无类型推断和代码补全。

**修复**:
- 新增 `ResourceGroup` 接口。
- `Resource` 接口添加 `groups?: ResourceGroup[]` 字段。

---

#### [F-03] fetchAllAssets 添加错误处理

**影响文件**: `web/src/pages/Assets/Groups/index.tsx`

**问题**: `fetchAllAssets` 函数缺少 `try/catch`，网络请求失败时页面无任何反馈，用户无法感知错误。

**修复**: 添加错误捕获，失败时通过 `message.error('获取资产列表失败')` 提示用户。

---

## [1.0.0] - 2026-03-06

### 新增
- 资产分组（ResourceGroup）管理功能：创建、编辑、删除分组，管理分组成员。
- 资源权限（ResourcePermission）管理：支持按资源或按分组授予 read/write 权限。
- 权限管理页面（前端）：展示和操作资源权限记录。

## [0.9.0] - 2026-01-26

### 新增
- CMDB 资产详情字段扩展：新增 `business_unit`、`owner`、`location`、`region` 等字段。
- 资产列表支持多维度筛选：按类型、云厂商、状态、关键字等过滤。

## [0.1.0] - 2026-01-22

### 新增
- 项目初始化：FastAPI 后端 + React 前端基础框架。
- IAM 模块：用户管理、角色管理、JWT 认证。
- CMDB 模块：资产增删改查基础功能。
- 审计日志：操作记录全覆盖。
- 动态菜单系统：树形结构、按角色权限过滤。
- Docker Compose 一键部署支持。
