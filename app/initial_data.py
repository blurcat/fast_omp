import asyncio
import logging
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.system import User, Menu
from app.core.config import settings
from app.core.security import get_password_hash

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_menus(session) -> None:
    """初始化菜单数据"""
    # 1. Dashboard
    result = await session.execute(select(Menu).where(Menu.path == '/dashboard'))
    if not result.scalars().first():
        logger.info("创建菜单: Dashboard")
        session.add(Menu(title='Dashboard', icon='dashboard', path='/dashboard', order=1))
    
    # 2. 系统管理 (父菜单)
    result = await session.execute(select(Menu).where(Menu.title == '系统管理'))
    sys_manage = result.scalars().first()
    if not sys_manage:
        logger.info("创建菜单: 系统管理")
        sys_manage = Menu(title='系统管理', icon='setting', path='/settings', order=99)
        session.add(sys_manage)
        await session.flush()  # 获取 ID
    
    # 3. 子菜单
    submenus = [
        {'title': '用户管理', 'icon': 'user', 'path': '/settings/users', 'order': 1},
        {'title': '角色管理', 'icon': 'team', 'path': '/settings/roles', 'order': 2},
        {'title': '菜单管理', 'icon': 'menu', 'path': '/settings/menus', 'order': 3},
        {'title': '审计日志', 'icon': 'file-text', 'path': '/settings/audit-logs', 'order': 4},
    ]
    
    for sub in submenus:
        result = await session.execute(select(Menu).where(Menu.path == sub['path']))
        if not result.scalars().first():
            logger.info(f"创建子菜单: {sub['title']}")
            session.add(Menu(
                title=sub['title'],
                icon=sub['icon'],
                path=sub['path'],
                order=sub['order'],
                parent_id=sys_manage.id
            ))

async def init_db() -> None:
    """
    初始化数据库数据
    创建默认超级管理员
    """
    async with AsyncSessionLocal() as session:
        # 1. 初始化超级管理员
        # 检查超级管理员是否存在
        result = await session.execute(
            select(User).where(User.username == settings.FIRST_SUPERUSER)
        )
        user = result.scalars().first()
        
        if not user:
            logger.info(f"正在创建超级管理员: {settings.FIRST_SUPERUSER}")
            user = User(
                username=settings.FIRST_SUPERUSER,
                email=settings.FIRST_SUPERUSER_EMAIL,
                hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
                is_superuser=True,
                is_active=True,
            )
            session.add(user)
            await session.commit() # 提交用户
            logger.info("超级管理员创建成功")
        else:
            logger.info("超级管理员已存在")
            
        # 2. 初始化菜单
        await init_menus(session)
        await session.commit()
        logger.info("菜单初始化完成")

if __name__ == "__main__":
    asyncio.run(init_db())
