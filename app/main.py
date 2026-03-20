from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel
from app.core.config import settings
from app.api.v1.api import api_router


class HealthResponse(BaseModel):
    status: str
    version: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI 生命周期管理
    在应用启动前和关闭后执行的逻辑
    """
    # 启动时安全检查
    if settings.is_insecure_secret_key:
        import os
        if os.getenv("ALLOW_INSECURE_SECRET_KEY", "").lower() != "true":
            raise RuntimeError(
                "生产环境安全检查失败：SECRET_KEY 使用了默认不安全的值。"
                "请在 .env 文件或环境变量中设置一个强随机密钥。"
                "如需在开发环境跳过此检查，设置 ALLOW_INSECURE_SECRET_KEY=true"
            )
        logger.warning("使用了默认 SECRET_KEY，仅允许在开发环境使用！")
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
# 通过 settings.ALLOWED_ORIGINS 配置允许的来源列表
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """服务健康检查"""
    return {"status": "ok", "version": "1.0.0"}

# 注册 API 路由
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    # 如果直接作为脚本运行，使用 uvicorn 启动
    # reload=True 用于开发环境热重载
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
