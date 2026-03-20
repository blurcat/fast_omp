from fastapi import APIRouter
from app.api.v1.system import auth, users, menus, roles, audit
from app.api.v1.cmdb import resources, stats, groups, permissions
from app.api.v1.monitor import channels, alert_rules, alert_events, metrics
from app.api.v1.jobs import templates as job_templates, executions as job_executions
from app.api.v1.changes import requests as change_requests
from app.api.v1.credentials import router as credentials_router
from app.api.v1.inspections import router as inspections_router

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["系统认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户管理"])
api_router.include_router(roles.router, prefix="/roles", tags=["角色管理"])
api_router.include_router(menus.router, prefix="/menus", tags=["菜单管理"])
api_router.include_router(audit.router, prefix="/audit", tags=["审计日志"])
api_router.include_router(resources.router, prefix="/assets", tags=["资产管理"])
api_router.include_router(groups.router, prefix="/asset-groups", tags=["资产分组"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["权限管理"])
api_router.include_router(stats.router, prefix="/stats", tags=["统计分析"])

# 监控告警
api_router.include_router(channels.router, prefix="/monitor/channels", tags=["告警渠道"])
api_router.include_router(alert_rules.router, prefix="/monitor/rules", tags=["告警规则"])
api_router.include_router(alert_events.router, prefix="/monitor/events", tags=["告警事件"])
api_router.include_router(metrics.router, prefix="/monitor/metrics", tags=["指标数据"])

# 作业执行
api_router.include_router(job_templates.router, prefix="/jobs/templates", tags=["作业模板"])
api_router.include_router(job_executions.router, prefix="/jobs/executions", tags=["作业执行"])

# 变更管理
api_router.include_router(change_requests.router, prefix="/changes", tags=["变更管理"])

# 凭证管理
api_router.include_router(credentials_router.router, prefix="/credentials", tags=["凭证管理"])

# 巡检管理
api_router.include_router(inspections_router.router, prefix="/inspections", tags=["巡检管理"])
