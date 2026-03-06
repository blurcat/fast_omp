from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# 创建异步数据库引擎
# echo=False: 关闭 SQL 语句日志输出（调试时可开启）
# future=True: 使用 SQLAlchemy 2.0 风格 API
engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=False, 
    future=True
)

# 创建异步 Session 工厂
# expire_on_commit=False: 提交后不立即使对象过期，避免在 async 环境下访问属性触发 lazy load 报错
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# FastAPI 依赖项 (Dependency)
async def get_db():
    """
    获取数据库会话
    用于 FastAPI 依赖注入，自动管理 Session 生命周期
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
