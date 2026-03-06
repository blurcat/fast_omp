from typing import Any, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.api import deps
from app.core.database import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter()

@router.get("/audit/logs", response_model=List[AuditLogResponse])
async def read_audit_logs(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
    username: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    ip_address: Optional[str] = None,
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取审计日志列表
    """
    query = select(AuditLog).order_by(desc(AuditLog.created_at))

    if username:
        query = query.where(AuditLog.username.ilike(f"%{username}%"))
    if action:
        query = query.where(AuditLog.action == action)
    if target_type:
        query = query.where(AuditLog.target_type == target_type)
    if ip_address:
        query = query.where(AuditLog.ip_address.ilike(f"%{ip_address}%"))

    result = await db.execute(query.offset(skip).limit(limit))
    logs = result.scalars().all()
    return logs
