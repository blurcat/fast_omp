from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.monitor import MetricRecord
from app.schemas.monitor import MetricRecordCreate, MetricRecordResponse
from app.services.monitor_service import evaluate_rules

router = APIRouter()


@router.post("/", response_model=MetricRecordResponse)
async def ingest_metric(
    *, db: AsyncSession = Depends(get_db),
    metric_in: MetricRecordCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """接收外部 Agent 推送的指标数据"""
    record = MetricRecord(**metric_in.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.post("/batch", response_model=List[MetricRecordResponse])
async def ingest_metrics_batch(
    *, db: AsyncSession = Depends(get_db),
    metrics: List[MetricRecordCreate],
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """批量推送指标"""
    records = [MetricRecord(**m.model_dump()) for m in metrics]
    for r in records:
        db.add(r)
    await db.commit()
    for r in records:
        await db.refresh(r)
    return records


@router.get("/", response_model=List[MetricRecordResponse])
async def list_metrics(
    db: AsyncSession = Depends(get_db),
    resource_id: Optional[int] = None,
    metric: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """获取指标记录列表，支持按资源和指标名称过滤"""
    stmt = select(MetricRecord)
    if resource_id:
        stmt = stmt.where(MetricRecord.resource_id == resource_id)
    if metric:
        stmt = stmt.where(MetricRecord.metric == metric)
    stmt = stmt.order_by(MetricRecord.collected_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/evaluate", summary="手动触发告警规则评估", response_model=Dict[str, int])
async def trigger_evaluation(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """手动触发告警规则评估，返回触发的告警数量"""
    count = await evaluate_rules(db)
    return {"fired_alerts": count}
