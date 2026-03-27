from typing import Any, List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.api import deps
from app.core.database import get_db
from app.models.cmdb import Resource, ResourceType


class StatsSummaryResponse(BaseModel):
    total: int
    active_hosts: int
    cloud_resources: int
    by_type: List[Dict[str, Any]]
    by_provider: List[Dict[str, Any]]
    by_status: List[Dict[str, Any]]


router = APIRouter()

@router.get("/summary", response_model=StatsSummaryResponse)
async def get_stats_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """
    获取资源统计概览

    - **total**: 全部资产总数
    - **active_hosts**: 状态为 running 的主机数量
    - **cloud_resources**: 非本地IDC（provider != local）的云资源数量
    - **by_type**: 按资产类型分布（含显示名称）
    - **by_provider**: 按云厂商分布
    - **by_status**: 按状态分布
    """
    # 总资产数
    total = (await db.execute(select(func.count(Resource.id)))).scalar() or 0

    # 活跃主机：type='host' 且 status='running'
    active_hosts = (await db.execute(
        select(func.count(Resource.id)).where(
            Resource.type == "host",
            Resource.status == "running"
        )
    )).scalar() or 0

    # 云资源：provider 不是 local
    cloud_resources = (await db.execute(
        select(func.count(Resource.id)).where(Resource.provider != "local")
    )).scalar() or 0

    # 按类型分布 — LEFT JOIN ResourceType 获取显示名称
    type_rows = (await db.execute(
        select(Resource.type, func.count(Resource.id), ResourceType.name)
        .outerjoin(ResourceType, Resource.type == ResourceType.value)
        .group_by(Resource.type, ResourceType.name)
        .order_by(func.count(Resource.id).desc())
    )).all()
    by_type = [{"type": row[2] or row[0], "value": row[0], "count": row[1]} for row in type_rows]

    # 按供应商分布
    provider_rows = (await db.execute(
        select(Resource.provider, func.count(Resource.id))
        .group_by(Resource.provider)
        .order_by(func.count(Resource.id).desc())
    )).all()
    by_provider = [{"provider": row[0], "count": row[1]} for row in provider_rows]

    # 按状态分布
    status_rows = (await db.execute(
        select(Resource.status, func.count(Resource.id)).group_by(Resource.status)
    )).all()
    by_status = [{"status": row[0], "count": row[1]} for row in status_rows]

    return {
        "total": total,
        "active_hosts": active_hosts,
        "cloud_resources": cloud_resources,
        "by_type": by_type,
        "by_provider": by_provider,
        "by_status": by_status,
    }
