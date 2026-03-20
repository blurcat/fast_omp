from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.database import get_db
from app.models.monitor import AlertRule, AlertChannel
from app.schemas.monitor import AlertRuleCreate, AlertRuleResponse, AlertRuleUpdate

router = APIRouter()


@router.get("/", response_model=List[AlertRuleResponse])
async def list_rules(
    db: AsyncSession = Depends(get_db),
    skip: int = 0, limit: int = 100,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(
        select(AlertRule).options(selectinload(AlertRule.channels)).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=AlertRuleResponse)
async def create_rule(
    *, db: AsyncSession = Depends(get_db),
    rule_in: AlertRuleCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    channel_ids = rule_in.channel_ids
    data = rule_in.model_dump(exclude={"channel_ids"})
    rule = AlertRule(**data)

    if channel_ids:
        ch_result = await db.execute(select(AlertChannel).where(AlertChannel.id.in_(channel_ids)))
        rule.channels = list(ch_result.scalars().all())

    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    # reload with channels
    result = await db.execute(
        select(AlertRule).where(AlertRule.id == rule.id).options(selectinload(AlertRule.channels))
    )
    return result.scalars().first()


@router.put("/{rule_id}", response_model=AlertRuleResponse)
async def update_rule(
    *, db: AsyncSession = Depends(get_db),
    rule_id: int,
    rule_in: AlertRuleUpdate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(
        select(AlertRule).where(AlertRule.id == rule_id).options(selectinload(AlertRule.channels))
    )
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    channel_ids = rule_in.channel_ids
    for k, v in rule_in.model_dump(exclude={"channel_ids"}, exclude_unset=True).items():
        setattr(rule, k, v)

    if channel_ids is not None:
        ch_result = await db.execute(select(AlertChannel).where(AlertChannel.id.in_(channel_ids)))
        rule.channels = list(ch_result.scalars().all())

    await db.commit()
    await db.refresh(rule)
    result = await db.execute(
        select(AlertRule).where(AlertRule.id == rule.id).options(selectinload(AlertRule.channels))
    )
    return result.scalars().first()


@router.delete("/{rule_id}")
async def delete_rule(
    *, db: AsyncSession = Depends(get_db),
    rule_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"message": "Deleted"}
