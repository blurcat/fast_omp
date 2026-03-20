from typing import Any, List, Optional, Literal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.api import deps
from app.core.database import get_db
from app.models.changes import ChangeRequest, ChangeStatus
from app.schemas.changes import ChangeRequestCreate, ChangeRequestResponse, ChangeRequestUpdate
from app.schemas.system import MessageResponse
from app.core.audit import create_audit_log


class RejectInput(BaseModel):
    notes: str = ""


router = APIRouter()


@router.get("/", response_model=List[ChangeRequestResponse])
async def list_changes(
    db: AsyncSession = Depends(get_db),
    status: Optional[Literal["draft", "pending", "approved", "rejected", "executing", "completed", "cancelled"]] = None,
    skip: int = 0, limit: int = 50,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """获取变更请求列表，支持按状态过滤"""
    stmt = select(ChangeRequest)
    if status:
        stmt = stmt.where(ChangeRequest.status == status)
    stmt = stmt.order_by(ChangeRequest.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=ChangeRequestResponse)
async def create_change(
    *, db: AsyncSession = Depends(get_db),
    change_in: ChangeRequestCreate,
    current_user=Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """创建新的变更请求"""
    change = ChangeRequest(
        **change_in.model_dump(),
        status=ChangeStatus.DRAFT,
        created_by=current_user.username,
        created_by_id=current_user.id,
    )
    db.add(change)
    await db.commit()
    await db.refresh(change)
    await create_audit_log(db, user_id=current_user.id, username=current_user.username,
                           action="create", target_type="change_request", target_id=str(change.id),
                           ip_address=request.client.host if request.client else None)
    return change


@router.get("/{change_id}", response_model=ChangeRequestResponse, responses={404: {"description": "变更不存在"}})
async def get_change(
    *, db: AsyncSession = Depends(get_db),
    change_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """获取变更请求详情"""
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalars().first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    return change


@router.put("/{change_id}", response_model=ChangeRequestResponse, responses={404: {"description": "变更不存在"}, 400: {"description": "状态不允许修改"}})
async def update_change(
    *, db: AsyncSession = Depends(get_db),
    change_id: int,
    change_in: ChangeRequestUpdate,
    current_user=Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """更新变更请求（仅草稿或待审批状态可修改）"""
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalars().first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    if change.status not in (ChangeStatus.DRAFT, ChangeStatus.PENDING):
        raise HTTPException(status_code=400, detail="Cannot modify change in current status")
    for k, v in change_in.model_dump(exclude_unset=True).items():
        setattr(change, k, v)
    await db.commit()
    await db.refresh(change)
    return change


@router.post("/{change_id}/submit", response_model=ChangeRequestResponse, responses={404: {"description": "变更不存在"}})
async def submit_change(
    *, db: AsyncSession = Depends(get_db),
    change_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """提交变更请求，状态变为待审批"""
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalars().first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    change.status = ChangeStatus.PENDING
    await db.commit()
    await db.refresh(change)
    return change


@router.post("/{change_id}/approve", response_model=ChangeRequestResponse, responses={404: {"description": "变更不存在"}})
async def approve_change(
    *, db: AsyncSession = Depends(get_db),
    change_id: int,
    current_user=Depends(deps.get_current_superuser),
) -> Any:
    """审批通过变更请求（仅超级管理员）"""
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalars().first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    change.status = ChangeStatus.APPROVED
    change.approver_id = current_user.id
    change.approver_name = current_user.username
    change.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(change)
    return change


@router.post("/{change_id}/reject", response_model=ChangeRequestResponse, responses={404: {"description": "变更不存在"}, 400: {"description": "状态不允许修改"}})
async def reject_change(
    *, db: AsyncSession = Depends(get_db),
    change_id: int,
    reject_in: RejectInput,
    current_user=Depends(deps.get_current_superuser),
) -> Any:
    """拒绝变更请求（仅超级管理员）"""
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalars().first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    change.status = ChangeStatus.REJECTED
    change.approver_id = current_user.id
    change.approver_name = current_user.username
    change.approved_at = datetime.now(timezone.utc)
    change.notes = reject_in.notes
    await db.commit()
    await db.refresh(change)
    return change


@router.delete("/{change_id}", response_model=MessageResponse, responses={404: {"description": "变更不存在"}})
async def delete_change(
    *, db: AsyncSession = Depends(get_db),
    change_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """删除变更请求"""
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalars().first()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    await db.delete(change)
    await db.commit()
    return {"message": "Deleted"}
