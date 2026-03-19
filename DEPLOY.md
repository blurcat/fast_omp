# Ops Middle Platform 部署文档

本文档介绍两种部署方式：**本地开发部署** 和 **Docker Compose 容器化部署**。

## 目录

- [环境要求](#环境要求)
- [配置环境变量](#配置环境变量)
- [方式一：本地开发部署](#方式一本地开发部署)
- [方式二：Docker Compose 部署](#方式二docker-compose-部署)
- [数据库迁移升级](#数据库迁移升级)
- [常见问题](#常见问题)

---

## 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Python | >= 3.12 | 本地部署必须 |
| Node.js | >= 18 | 本地部署必须 |
| PostgreSQL | >= 15 | 本地部署必须，Docker 自动创建 |
| Redis | >= 7 | 本地部署必须，Docker 自动创建 |
| Docker & Docker Compose | 最新稳定版 | 容器化部署必须 |

---

## 配置环境变量

两种部署方式均需要先配置环境变量。

```bash
cp .env.example .env
```

然后编辑 `.env`，**至少填写以下必填项**：

```ini
# 生成强随机密钥：openssl rand -hex 32
SECRET_KEY=<替换为强随机字符串>

# 数据库密码
POSTGRES_PASSWORD=<替换为强密码>

# 初始管理员密码（不少于8位）
FIRST_SUPERUSER_PASSWORD=<替换为强密码>
```

其余配置项说明见 `.env.example`。

> `.env` 文件已在 `.gitignore` 中排除，不会被提交到代码仓库。

---

## 方式一：本地开发部署

适用于开发调试，直接在宿主机运行服务。

### 1. 后端启动

```bash
# 进入项目根目录
cd fast_omp

# 创建并激活虚拟环境
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# 安装依赖
pip install -r requirements.txt

# 运行数据库迁移
alembic upgrade head

# 初始化数据（创建默认管理员和菜单，首次部署必须执行）
python -m app.initial_data

# 启动后端服务
python -m app.main
# 或
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端启动后访问：
- API 文档（Swagger UI）：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

> **注意**：首次启动时若 `.env` 中 `SECRET_KEY` 为默认值，服务将拒绝启动。开发环境可在 `.env` 中加入 `ALLOW_INSECURE_SECRET_KEY=true` 跳过此检查。

### 2. 前端启动

新开一个终端窗口：

```bash
cd web
npm install
npm run dev
```

前端启动后访问：http://localhost:5173

---

## 方式二：Docker Compose 部署

适用于快速预览或生产环境。自动启动 db、redis、backend、frontend 四个容器。

### 1. 确认 .env 已配置

```bash
# 确认必填项已设置
grep -E "^(SECRET_KEY|POSTGRES_PASSWORD|FIRST_SUPERUSER_PASSWORD)" .env
```

三行均有值后再继续。

### 2. 启动所有服务

```bash
docker-compose up -d --build
```

- `--build`：强制重新构建镜像（首次运行或代码变更后使用）
- `-d`：后台运行

> **注意**：若修改了后端代码（如 `config.py`、`requirements.txt`）但镜像显示 `0.0s`（使用了缓存），需强制重建：
> ```bash
> docker-compose build --no-cache backend
> docker-compose up -d
> ```

启动过程中 backend 容器会自动执行 `alembic upgrade head`。**首次部署还需手动初始化管理员**：

```bash
docker-compose exec backend python -m app.initial_data
```

### 3. 访问服务

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost |
| API 文档（Swagger UI） | http://localhost:8000/docs |
| 健康检查 | http://localhost:8000/health |

### 4. 常用管理命令

```bash
# 查看所有容器状态
docker-compose ps

# 实时查看所有日志
docker-compose logs -f

# 只看后端日志
docker-compose logs -f backend

# 停止服务（保留数据卷）
docker-compose down

# 停止服务并删除数据卷（清空数据库，谨慎操作）
docker-compose down -v
```

### 5. 数据持久化

数据库数据通过 `postgres_data` 卷持久化，执行 `docker-compose down` 不会丢失数据，只有加 `-v` 才会删除。

---

## 数据库迁移升级

当项目更新包含新的数据库迁移时，需要执行升级命令。

### 本地环境

```bash
# 确认当前迁移版本
alembic current

# 升级到最新版本
alembic upgrade head
```

### Docker 环境

```bash
docker-compose exec backend alembic upgrade head
```

### 回滚迁移

```bash
# 回滚一个版本
alembic downgrade -1

# 回滚到指定版本
alembic downgrade <revision_id>
```

---

## 常见问题

**1. 启动报错：`SECRET_KEY 使用了默认不安全的值`**

`.env` 中 `SECRET_KEY` 未修改，仍为默认占位符。请用 `openssl rand -hex 32` 生成新密钥并填入。开发环境可临时设置 `ALLOW_INSECURE_SECRET_KEY=true`。

---

**2. Docker Compose 启动报错：`variable is not set`**

`.env` 文件中缺少必填变量（`POSTGRES_PASSWORD` 或 `SECRET_KEY`）。检查 `.env` 文件是否存在且已正确填写。

---

**3. 端口冲突**

若本地 `80`、`8000`、`5432`、`6379` 端口已被占用，修改 `docker-compose.yml` 中对应服务的 `ports` 映射，例如：
```yaml
ports:
  - "8080:80"   # 将前端改为 8080 端口
```

---

**4. 数据库连接失败**

```bash
# 检查容器状态
docker-compose ps

# 查看数据库日志
docker-compose logs db

# 查看后端日志
docker-compose logs backend
```

确认 `db` 容器状态为 `healthy` 后再启动 `backend`。

---

**5. 前端无法请求 API**

- 确认前端请求发往相对路径 `/api/v1`，而非硬编码的 `localhost:8000`。
- 检查 `web/nginx.conf` 中 `/api/` 的反向代理配置是否指向正确的 backend 地址。

---

**6. 启动报错：`error parsing value for field "ALLOWED_ORIGINS"`**

`ALLOWED_ORIGINS` 格式不正确。使用**逗号分隔**，不要加方括号或引号：

```ini
# 正确
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# 错误（不支持）
ALLOWED_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

---

**7. 启动报错：`No module named 'app'`**

不要用 `python app/initial_data.py`，要以模块方式运行：

```bash
python -m app.initial_data
```

---

**8. 启动报错：`ValueError: password cannot be longer than 72 bytes`**

`passlib` 与 `bcrypt>=4.1` 存在兼容性问题。确认 `requirements.txt` 中已固定版本：

```
bcrypt==4.0.1
```

然后重新安装：

```bash
pip install "bcrypt==4.0.1"
```

---

**9. 初始管理员密码忘记**

通过数据库直接重置（需先生成新的 bcrypt hash）：

```bash
# 进入后端容器
docker-compose exec backend python -c "
from app.core.security import get_password_hash
print(get_password_hash('新密码'))
"
# 将输出的 hash 更新到数据库 sys_users 表
```
