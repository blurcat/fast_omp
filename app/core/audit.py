from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

async def create_audit_log(
    db: AsyncSession,
    user_id: int,
    username: str,
    action: str,
    target_type: str,
    target_id: str,
    details: dict = None,
    ip_address: str = None
):
    log = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        details=details or {},
        ip_address=ip_address
    )
    db.add(log)
    await db.commit()

