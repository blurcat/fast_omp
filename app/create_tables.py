import asyncio
from app.core.database import engine
from app.models.base import Base
# Import all models to ensure they are registered in Base.metadata
from app.models.cmdb import *
from app.models.system import *
from app.models.audit import *

async def init_models():
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

if __name__ == "__main__":
    asyncio.run(init_models())
