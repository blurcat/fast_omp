from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.cmdb import ResourcePermission, PermissionType
from app.schemas.cmdb import ResourcePermissionCreate, ResourcePermissionResponse
from app.core.audit import create_audit_log

router = APIRouter()

@router.post("/", response_model=ResourcePermissionResponse)
async def create_permission(
    *,
    db: AsyncSession = Depends(get_db),
    perm_in: ResourcePermissionCreate,
    current_user = Depends(deps.get_current_superuser),
    request: Request,
) -> Any:
    """
    授予权限
    只有超级管理员可以操作
    """
    # Validate input: either resource_id or group_id must be set, but not both?
    # Actually, can be both if we want complex rules, but usually one.
    if not perm_in.resource_id and not perm_in.group_id:
        raise HTTPException(status_code=400, detail="Must specify either resource_id or group_id")
    
    # Check if permission already exists
    stmt = select(ResourcePermission).where(
        ResourcePermission.user_id == perm_in.user_id,
        ResourcePermission.resource_id == perm_in.resource_id,
        ResourcePermission.group_id == perm_in.group_id
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
        existing.permission = perm_in.permission
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        return existing
        
    permission = ResourcePermission(
        user_id=perm_in.user_id,
        resource_id=perm_in.resource_id,
        group_id=perm_in.group_id,
        permission=perm_in.permission
    )
    db.add(permission)
    await db.commit()
    await db.refresh(permission)
    
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="grant",
        target_type="permission",
        target_id=str(permission.id),
        details=perm_in.model_dump(),
        ip_address=request.client.host if request.client else None
    )
    return permission

@router.get("/", response_model=List[ResourcePermissionResponse])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    user_id: int = None,
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    列出权限
    """
    stmt = select(ResourcePermission)
    if user_id:
        stmt = stmt.where(ResourcePermission.user_id == user_id)
        
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.delete("/{perm_id}", response_model=ResourcePermissionResponse)
async def revoke_permission(
    *,
    db: AsyncSession = Depends(get_db),
    perm_id: int,
    current_user = Depends(deps.get_current_superuser),
    request: Request,
) -> Any:
    """
    撤销权限
    """
    result = await db.execute(select(ResourcePermission).where(ResourcePermission.id == perm_id))
    perm = result.scalars().first()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
        
    await db.delete(perm)
    await db.commit()
    
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="revoke",
        target_type="permission",
        target_id=str(perm.id),
        details={"id": perm.id},
        ip_address=request.client.host if request.client else None
    )
    return perm
