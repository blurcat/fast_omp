from typing import Any, List, Optional, Literal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.inspections import InspectionTemplate, InspectionTask, InspectionStatus
from app.schemas.inspections import (
    InspectionTemplateCreate, InspectionTemplateResponse, InspectionTemplateUpdate,
    InspectionTaskCreate, InspectionTaskResponse,
)
from app.schemas.system import MessageResponse

router = APIRouter()


# --- Templates ---

@router.get("/templates", response_model=List[InspectionTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    skip: int = 0, limit: int = 100,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """获取巡检模板列表"""
    result = await db.execute(select(InspectionTemplate).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/templates", response_model=InspectionTemplateResponse)
async def create_template(
    *, db: AsyncSession = Depends(get_db),
    tmpl_in: InspectionTemplateCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """创建新的巡检模板"""
    tmpl = InspectionTemplate(**tmpl_in.model_dump(), created_by=current_user.username)
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.put("/templates/{tmpl_id}", response_model=InspectionTemplateResponse, responses={404: {"description": "不存在"}})
async def update_template(
    *, db: AsyncSession = Depends(get_db),
    tmpl_id: int,
    tmpl_in: InspectionTemplateUpdate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """更新巡检模板"""
    result = await db.execute(select(InspectionTemplate).where(InspectionTemplate.id == tmpl_id))
    tmpl = result.scalars().first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    for k, v in tmpl_in.model_dump(exclude_unset=True).items():
        setattr(tmpl, k, v)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{tmpl_id}", response_model=MessageResponse, responses={404: {"description": "不存在"}})
async def delete_template(
    *, db: AsyncSession = Depends(get_db),
    tmpl_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """删除巡检模板"""
    result = await db.execute(select(InspectionTemplate).where(InspectionTemplate.id == tmpl_id))
    tmpl = result.scalars().first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(tmpl)
    await db.commit()
    return {"message": "Deleted"}


# --- Tasks ---

@router.get("/tasks", response_model=List[InspectionTaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    status: Optional[Literal["pending", "running", "completed", "failed"]] = None,
    skip: int = 0, limit: int = 50,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """获取巡检任务列表，支持按状态过滤"""
    stmt = select(InspectionTask)
    if status:
        stmt = stmt.where(InspectionTask.status == status)
    stmt = stmt.order_by(InspectionTask.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/tasks", response_model=InspectionTaskResponse)
async def create_task(
    *, db: AsyncSession = Depends(get_db),
    task_in: InspectionTaskCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """创建新的巡检任务"""
    task = InspectionTask(**task_in.model_dump(), created_by=current_user.username)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.post("/tasks/{task_id}/run", response_model=InspectionTaskResponse, responses={404: {"description": "不存在"}})
async def run_task(
    *, db: AsyncSession = Depends(get_db),
    task_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """执行巡检任务"""
    result = await db.execute(select(InspectionTask).where(InspectionTask.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = InspectionStatus.RUNNING
    task.started_at = datetime.now(timezone.utc)
    # TODO: real inspection logic via job_service
    task.status = InspectionStatus.COMPLETED
    task.finished_at = datetime.now(timezone.utc)
    task.report = {"message": "Inspection completed", "items": []}
    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", response_model=MessageResponse, responses={404: {"description": "不存在"}})
async def delete_task(
    *, db: AsyncSession = Depends(get_db),
    task_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """删除巡检任务"""
    result = await db.execute(select(InspectionTask).where(InspectionTask.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"message": "Deleted"}
