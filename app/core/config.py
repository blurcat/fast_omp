from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

_INSECURE_DEFAULT_KEY = "CHANGE_THIS_IN_PRODUCTION_SECRET_KEY"

class Settings(BaseSettings):
    """
    系统配置类
    基于 Pydantic Settings 管理环境变量，自动读取 .env 文件
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_list_delimiter=",",
    )

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
    # 生产环境必须通过环境变量设置 SECRET_KEY，否则应用启动时会报错
    SECRET_KEY: str = _INSECURE_DEFAULT_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Token 过期时间（分钟）

    # CORS 允许的来源列表（逗号分隔，生产环境请配置具体域名）
    # 示例: ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost"]

    # Redis 配置 (用于缓存和 Celery)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # 初始化超级管理员 (用于 initial_data.py)
    FIRST_SUPERUSER: str = "admin"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"
    FIRST_SUPERUSER_EMAIL: str = "admin@example.com"

    @property
    def is_insecure_secret_key(self) -> bool:
        return self.SECRET_KEY == _INSECURE_DEFAULT_KEY

# 实例化配置对象，全局单例
settings = Settings()
