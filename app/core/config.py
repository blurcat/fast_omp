from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """
    系统配置类
    基于 Pydantic Settings 管理环境变量
    自动读取 .env 文件
    """
    PROJECT_NAME: str = "Ops Middle Platform"
    API_V1_STR: str = "/api/v1"
    
    # 数据库配置 (PostgreSQL)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "fast_mm"
    POSTGRES_PASSWORD: str = "fast_mm_secret"
    POSTGRES_DB: str = "fast_mm"
    POSTGRES_PORT: str = "5432"
    
    # 异步数据库连接 URL
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # 安全配置 (Security)
    # 生产环境请务必修改 SECRET_KEY
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Token 过期时间（分钟）
    
    # Redis 配置 (用于缓存和 Celery)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # 初始化超级管理员 (用于 initial_data.py)
    FIRST_SUPERUSER: str = "admin"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"
    FIRST_SUPERUSER_EMAIL: str = "admin@example.com"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# 实例化配置对象，全局单例
settings = Settings()
