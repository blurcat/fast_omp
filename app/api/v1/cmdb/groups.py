from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.database import get_db
from app.models.cmdb import ResourceGroup, Resource
from app.schemas.cmdb import ResourceGroupCreate, ResourceGroupUpdate, ResourceGroupResponse, ResourceGroupDetailResponse
from app.core.audit import create_audit_log

router = APIRouter()

@router.get("/", response_model=List[ResourceGroupResponse])
async def read_resource_groups(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取资源分组列表
    """
    result = await db.execute(select(ResourceGroup).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=ResourceGroupResponse)
async def create_resource_group(
    *,
    db: AsyncSession = Depends(get_db),
    group_in: ResourceGroupCreate,
    current_user = Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    创建资源分组
    """
    group = ResourceGroup(name=group_in.name, description=group_in.description)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        target_type="resource_group",
        target_id=str(group.id),
        details=group_in.model_dump(),
        ip_address=request.client.host if request.client else None
    )
    return group

@router.get("/{group_id}", response_model=ResourceGroupDetailResponse)
async def read_resource_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取指定资源分组 (包含成员)
    """
    result = await db.execute(select(ResourceGroup).options(selectinload(ResourceGroup.resources)).where(ResourceGroup.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Resource group not found")
    return group

@router.put("/{group_id}", response_model=ResourceGroupResponse)
async def update_resource_group(
    *,
    db: AsyncSession = Depends(get_db),
    group_id: int,
    group_in: ResourceGroupUpdate,
    current_user = Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    更新资源分组
    """
    result = await db.execute(select(ResourceGroup).where(ResourceGroup.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Resource group not found")
    
    if group_in.name is not None:
        group.name = group_in.name
    if group_in.description is not None:
        group.description = group_in.description
        
    db.add(group)
    await db.commit()
    await db.refresh(group)
    
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        target_type="resource_group",
        target_id=str(group.id),
        details=group_in.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None
    )
    return group

@router.delete("/{group_id}")
async def delete_resource_group(
    *,
    db: AsyncSession = Depends(get_db),
    group_id: int,
    current_user = Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    删除资源分组
    """
    result = await db.execute(select(ResourceGroup).where(ResourceGroup.id == group_id))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Resource group not found")

    # 在 delete+commit 前保存所需数据，commit 后 ORM 对象属性会过期
    group_id_str = str(group.id)
    group_name = group.name

    await db.delete(group)
    await db.commit()

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        target_type="resource_group",
        target_id=group_id_str,
        details={"name": group_name},
        ip_address=request.client.host if request.client else None
    )
    return {"status": "success", "id": int(group_id_str), "name": group_name}

@router.post("/{group_id}/resources/{resource_id}", response_model=ResourceGroupResponse)
async def add_resource_to_group(
    *,
    db: AsyncSession = Depends(get_db),
    group_id: int,
    resource_id: int,
    current_user = Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    将资源添加到分组
    """
    # Check group
    g_res = await db.execute(select(ResourceGroup).options(selectinload(ResourceGroup.resources)).where(ResourceGroup.id == group_id))
    group = g_res.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check resource
    r_res = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = r_res.scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if resource not in group.resources:
        group.resources.append(resource)
        await db.commit()
        await db.refresh(group)

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="add_member",
        target_type="resource_group",
        target_id=str(group_id),
        details={"group_name": group.name, "resource_id": resource_id, "resource_name": resource.name},
        ip_address=request.client.host if request.client else None
    )
    return group

@router.delete("/{group_id}/resources/{resource_id}", response_model=ResourceGroupResponse)
async def remove_resource_from_group(
    *,
    db: AsyncSession = Depends(get_db),
    group_id: int,
    resource_id: int,
    current_user = Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    从分组移除资源
    """
    # Check group
    g_res = await db.execute(select(ResourceGroup).options(selectinload(ResourceGroup.resources)).where(ResourceGroup.id == group_id))
    group = g_res.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check resource
    r_res = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = r_res.scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if resource in group.resources:
        group.resources.remove(resource)
        await db.commit()
        await db.refresh(group)

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="remove_member",
        target_type="resource_group",
        target_id=str(group_id),
        details={"group_name": group.name, "resource_id": resource_id, "resource_name": resource.name},
        ip_address=request.client.host if request.client else None
    )
    return group
