# Ops Middle Platform 部署文档

本文档详细介绍了 Ops Middle Platform（运维中台）的部署流程，包含**本地开发部署**和**Docker Compose 容器化部署**两种方式。

## 目录

- [环境要求](#环境要求)
- [方式一：本地开发部署](#方式一本地开发部署)
  - [1. 后端启动](#1-后端启动)
  - [2. 前端启动](#2-前端启动)
- [方式二：Docker Compose 部署](#方式二docker-compose-部署)
- [常见问题](#常见问题)

---

## 环境要求

- **操作系统**: macOS / Linux / Windows
- **Python**: >= 3.12 (本地部署需要)
- **Node.js**: >= 18 (本地部署需要)
- **Docker & Docker Compose**: (容器化部署需要)
- **PostgreSQL**: (本地部署需要，Docker 部署会自动创建)
- **Redis**: (本地部署需要，Docker 部署会自动创建)

---

## 方式一：本地开发部署

适用于开发调试，直接在宿主机运行服务。

### 1. 后端启动

确保你已经安装了 PostgreSQL 和 Redis 并已启动。

1.  **进入项目根目录**
    ```bash
    cd fast_mm
    ```

2.  **创建并激活虚拟环境**
    ```bash
    python -m venv .venv
    # macOS / Linux
    source .venv/bin/activate
    # Windows
    # .venv\Scripts\activate
    ```

3.  **安装依赖**
    ```bash
    pip install -r requirements.txt
    ```

4.  **配置环境变量**
    复制 `.env.example` (如果有) 或直接创建 `.env` 文件。确保数据库配置正确：
    ```ini
    # .env
    POSTGRES_SERVER=localhost
    POSTGRES_USER=fast_mm
    POSTGRES_PASSWORD=fast_mm_secret
    POSTGRES_DB=fast_mm
    POSTGRES_PORT=5432
    REDIS_HOST=localhost
    REDIS_PORT=6379
    ```

5.  **初始化数据库**
    ```bash
    # 运行数据库迁移
    alembic upgrade head
    
    # (可选) 初始化数据
    # python app/initial_data.py
    ```

6.  **启动服务**
    ```bash
    python -m app.main
    # 或者
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    后端文档地址: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. 前端启动

1.  **进入前端目录**
    ```bash
    cd web
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **启动开发服务器**
    ```bash
    npm run dev
    ```
    访问地址: [http://localhost:5173](http://localhost:5173) (具体端口看控制台输出)

---

## 方式二：Docker Compose 部署

适用于快速预览或生产环境部署。该方式会自动启动 Database, Redis, Backend, Frontend 四个容器。

### 1. 启动服务

在项目根目录下运行：

```bash
docker-compose up -d --build
```

- `--build`: 强制重新构建镜像（首次运行或代码变更后建议加上）。
- `-d`: 后台运行。

### 2. 访问服务

- **前端页面**: [http://localhost](http://localhost) (默认监听 80 端口)
- **后端 API**: [http://localhost/api/v1](http://localhost/api/v1) (通过 Nginx 转发)
- **后端文档**: [http://localhost/api/v1/docs](http://localhost/api/v1/docs) (注意：因为 Nginx 转发路径问题，Swgger UI 可能需要调整，建议开发时直接访问 8000 端口: [http://localhost:8000/docs](http://localhost:8000/docs))

### 3. 查看日志

```bash
docker-compose logs -f
```

### 4. 停止服务

```bash
docker-compose down
```

### 5. 数据持久化

Docker Compose 配置中已挂载数据卷 `postgres_data`，数据库数据会持久化保存。

---

## 常见问题

1.  **端口冲突**
    - 如果本地 8000, 5432, 6379, 80 端口被占用，请修改 `docker-compose.yml` 中的 `ports` 映射。例如将前端映射为 8080: `8080:80`。

2.  **数据库连接失败**
    - 检查 Docker 容器是否正常启动：`docker-compose ps`。
    - 检查 `backend` 服务日志：`docker-compose logs backend`。

3.  **前端无法访问 API**
    - 确保 Nginx 配置正确转发了 `/api/v1`。
    - 检查前端网络请求是否发往 `/api/v1` (相对路径) 而不是硬编码的 `localhost:8000`。
