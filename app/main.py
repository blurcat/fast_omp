from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from app.core.config import settings
from app.api.v1.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI 生命周期管理
    在应用启动前和关闭后执行的逻辑
    """
    # 启动时执行
    logger.info("系统启动中: 正在检查数据库连接与 Redis...")
    yield
    # 关闭时执行
    logger.info("系统关闭中: 正在清理资源...")

# 初始化 FastAPI 应用
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="运维中台一期核心：统一登录、运维门户、资产中心、多云资源同步",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS 跨域配置
# 允许所有来源访问（生产环境建议配置具体的域名）
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有 HTTP 头
)

@app.get("/health")
async def health_check():
    """
    健康检查接口
    用于 K8S livenessProbe 或负载均衡健康检查
    """
    return {"status": "ok", "version": "1.0.0"}

# 注册 API 路由
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    # 如果直接作为脚本运行，使用 uvicorn 启动
    # reload=True 用于开发环境热重载
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
