from typing import Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.monitor import AlertEvent, AlertStatus
from app.schemas.monitor import AlertEventCreate, AlertEventResponse

router = APIRouter()


@router.get("/", response_model=List[AlertEventResponse])
async def list_events(
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    stmt = select(AlertEvent)
    if status:
        stmt = stmt.where(AlertEvent.status == status)
    if severity:
        stmt = stmt.where(AlertEvent.severity == severity)
    stmt = stmt.order_by(AlertEvent.started_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=AlertEventResponse)
async def create_event(
    *, db: AsyncSession = Depends(get_db),
    event_in: AlertEventCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """手动创建告警事件（用于外部系统推送）"""
    event = AlertEvent(**event_in.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.post("/{event_id}/acknowledge", response_model=AlertEventResponse)
async def acknowledge_event(
    *, db: AsyncSession = Depends(get_db),
    event_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(AlertEvent).where(AlertEvent.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = AlertStatus.ACKNOWLEDGED
    event.acknowledged_by = current_user.username
    event.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(event)
    return event


@router.post("/{event_id}/resolve", response_model=AlertEventResponse)
async def resolve_event(
    *, db: AsyncSession = Depends(get_db),
    event_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(AlertEvent).where(AlertEvent.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = AlertStatus.RESOLVED
    event.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(event)
    return event
