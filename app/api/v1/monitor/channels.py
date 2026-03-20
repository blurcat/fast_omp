from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.monitor import AlertChannel
from app.schemas.monitor import AlertChannelCreate, AlertChannelResponse, AlertChannelUpdate

router = APIRouter()


@router.get("/", response_model=List[AlertChannelResponse])
async def list_channels(
    db: AsyncSession = Depends(get_db),
    skip: int = 0, limit: int = 100,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(AlertChannel).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=AlertChannelResponse)
async def create_channel(
    *, db: AsyncSession = Depends(get_db),
    channel_in: AlertChannelCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    channel = AlertChannel(**channel_in.model_dump())
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.put("/{channel_id}", response_model=AlertChannelResponse)
async def update_channel(
    *, db: AsyncSession = Depends(get_db),
    channel_id: int,
    channel_in: AlertChannelUpdate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(AlertChannel).where(AlertChannel.id == channel_id))
    channel = result.scalars().first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    for k, v in channel_in.model_dump(exclude_unset=True).items():
        setattr(channel, k, v)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.delete("/{channel_id}")
async def delete_channel(
    *, db: AsyncSession = Depends(get_db),
    channel_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(AlertChannel).where(AlertChannel.id == channel_id))
    channel = result.scalars().first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    await db.delete(channel)
    await db.commit()
    return {"message": "Deleted"}
