from fastapi import APIRouter
from app.api.v1.system import auth, users, menus, roles, audit
from app.api.v1.cmdb import resources, stats

# 创建 API 路由实例
api_router = APIRouter()

# 注册各个模块的路由
# tags 用于在 Swagger UI 中分组显示
api_router.include_router(auth.router, prefix="/auth", tags=["系统认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户管理"])
api_router.include_router(roles.router, prefix="/roles", tags=["角色管理"])
api_router.include_router(menus.router, prefix="/menus", tags=["菜单管理"])
api_router.include_router(audit.router, tags=["审计日志"])
api_router.include_router(resources.router, prefix="/assets", tags=["资产管理"])
api_router.include_router(stats.router, prefix="/stats", tags=["统计分析"])
