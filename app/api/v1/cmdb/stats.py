from typing import Any, List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api import deps
from app.core.database import get_db
from app.models.cmdb import Resource
from app.models.system import User

router = APIRouter()

@router.get("/summary")
async def get_stats_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取资源统计概览
    """
    # 总资源数
    total_result = await db.execute(select(func.count(Resource.id)))
    total = total_result.scalar() or 0
    
    # 按类型分布
    type_result = await db.execute(
        select(Resource.type, func.count(Resource.id)).group_by(Resource.type)
    )
    by_type = [{"type": row[0], "count": row[1]} for row in type_result.all()]
    
    # 按供应商分布
    provider_result = await db.execute(
        select(Resource.provider, func.count(Resource.id)).group_by(Resource.provider)
    )
    by_provider = [{"provider": row[0], "count": row[1]} for row in provider_result.all()]
    
    # 按状态分布
    status_result = await db.execute(
        select(Resource.status, func.count(Resource.id)).group_by(Resource.status)
    )
    by_status = [{"status": row[0], "count": row[1]} for row in status_result.all()]
    
    return {
        "total": total,
        "by_type": by_type,
        "by_provider": by_provider,
        "by_status": by_status
    }
