from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.database import get_db
from app.models.cmdb import Resource, ResourcePermission, ResourceGroup, resource_groups_association, PermissionType
from app.schemas.cmdb import ResourceCreate, ResourceResponse, ResourceUpdate
from app.core.audit import create_audit_log

router = APIRouter()

async def check_permission(db: AsyncSession, user_id: int, resource_id: int, required_perm: PermissionType) -> bool:
    """
    检查用户对指定资源的权限。
    支持直接权限（绑定到资源）和组权限（通过资源分组继承）。
    WRITE 权限包含 READ 权限。
    """
    def has_required_perm(perm_level: PermissionType) -> bool:
        if required_perm == PermissionType.READ:
            return True  # 用户拥有任何权限级别均可读
        return perm_level == PermissionType.WRITE

    # 检查直接权限
    stmt = select(ResourcePermission).where(
        ResourcePermission.user_id == user_id,
        ResourcePermission.resource_id == resource_id
    )
    result = await db.execute(stmt)
    perm = result.scalars().first()
    if perm and has_required_perm(perm.permission):
        return True

    # 检查组权限：获取该资源所属的分组
    stmt = select(ResourceGroup.id).join(
        resource_groups_association,
        ResourceGroup.id == resource_groups_association.c.group_id
    ).where(resource_groups_association.c.resource_id == resource_id)
    result = await db.execute(stmt)
    group_ids = result.scalars().all()

    if not group_ids:
        return False

    # 检查用户在这些分组上的权限
    stmt = select(ResourcePermission).where(
        ResourcePermission.user_id == user_id,
        ResourcePermission.group_id.in_(group_ids)
    )
    result = await db.execute(stmt)
    for p in result.scalars().all():
        if has_required_perm(p.permission):
            return True

    return False


@router.get("/", response_model=List[ResourceResponse])
async def read_resources(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    category: Optional[str] = None,
    provider: Optional[str] = None,
    status: Optional[str] = None,
    name: Optional[str] = None,
    ip_address: Optional[str] = None,
    region: Optional[str] = None,
    location: Optional[str] = None,
    keyword: Optional[str] = None,
    group_id: Optional[int] = None,
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取资源列表
    支持分页和过滤
    """
    query = select(Resource).options(selectinload(Resource.groups))
    
    if not current_user.is_superuser:
        # Check direct permissions
        direct_perm_subq = select(ResourcePermission.resource_id).where(
            ResourcePermission.user_id == current_user.id,
            ResourcePermission.resource_id.isnot(None)
        )
        
        # Check group permissions
        # Join Resource -> ResourceGroupItems -> ResourceGroup -> ResourcePermission
        group_perm_subq = select(resource_groups_association.c.resource_id).select_from(
            resource_groups_association.join(
                ResourcePermission,
                resource_groups_association.c.group_id == ResourcePermission.group_id
            )
        ).where(
            ResourcePermission.user_id == current_user.id
        )
        
        query = query.where(
            or_(
                Resource.id.in_(direct_perm_subq),
                Resource.id.in_(group_perm_subq)
            )
        )
    
    if type:
        query = query.where(Resource.type == type)
    if category:
        query = query.where(Resource.category == category)
    if provider:
        query = query.where(Resource.provider == provider)
    if status:
        query = query.where(Resource.status == status)
    if name:
        query = query.where(Resource.name.ilike(f"%{name}%"))
    if ip_address:
        query = query.where(Resource.ip_address.ilike(f"%{ip_address}%"))
    if region:
        query = query.where(Resource.region.ilike(f"%{region}%"))
    if location:
        query = query.where(Resource.location.ilike(f"%{location}%"))
    if keyword:
        # 简单实现：同时搜索名称和IP
        query = query.where((Resource.name.ilike(f"%{keyword}%")) | (Resource.ip_address.ilike(f"%{keyword}%")))
    
    # Filter by group_id
    if group_id:
        query = query.join(
            resource_groups_association,
            Resource.id == resource_groups_association.c.resource_id
        ).where(resource_groups_association.c.group_id == group_id)
            
    result = await db.execute(query.offset(skip).limit(limit))
    resources = result.scalars().all()
    return resources

@router.post("/", response_model=ResourceResponse)
async def create_resource(
    *,
    db: AsyncSession = Depends(get_db),
    resource_in: ResourceCreate,
    current_user: Any = Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    创建新资源
    """
    resource = Resource(
        name=resource_in.name,
        type=resource_in.type,
        category=resource_in.category,
        provider=resource_in.provider,
        region=resource_in.region,
        ip_address=resource_in.ip_address,
        description=resource_in.description,
        location=resource_in.location,
        status=resource_in.status,
        business_unit=resource_in.business_unit,
        owner=resource_in.owner,
        data=resource_in.data,
        tags=resource_in.tags,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)

    # Handle group_ids
    if resource_in.group_ids:
        stmt = select(ResourceGroup).where(ResourceGroup.id.in_(resource_in.group_ids))
        result = await db.execute(stmt)
        groups = result.scalars().all()
        if groups:
            # Re-fetch with options to ensure we can modify relationship
            # Or since we know it is new and empty, we might just set it.
            # But to be safe with SQLAlchemy async:
            resource.groups = list(groups)
            await db.commit()
            await db.refresh(resource)

    # 记录操作日志
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        target_type="asset",
        target_id=str(resource.id),
        details=resource_in.model_dump(),
        ip_address=request.client.host if request.client else None
    )

    # Re-fetch with relations
    result = await db.execute(
        select(Resource).options(selectinload(Resource.groups)).where(Resource.id == resource.id)
    )
    resource = result.scalars().first()

    return resource

@router.delete("/{resource_id}")
async def delete_resource(
    *,
    db: AsyncSession = Depends(get_db),
    resource_id: int,
    current_user: Any = Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    删除资源
    """
    # Check permissions
    if not current_user.is_superuser:
        has_perm = await check_permission(db, current_user.id, resource_id, PermissionType.WRITE)
        if not has_perm:
            raise HTTPException(status_code=403, detail="Permission denied")

    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="未找到该资源")

    # 在 delete+commit 前保存所需数据，commit 后 ORM 对象属性会过期
    resource_id_str = str(resource.id)
    resource_name = resource.name

    await db.delete(resource)
    await db.commit()

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        target_type="asset",
        target_id=resource_id_str,
        details={"name": resource_name},
        ip_address=request.client.host if request.client else None
    )

    return {"status": "success", "id": int(resource_id_str), "name": resource_name}

@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    *,
    db: AsyncSession = Depends(get_db),
    resource_id: int,
    resource_in: ResourceUpdate,
    current_user: Any = Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    更新资源信息
    """
    # Check permissions
    if not current_user.is_superuser:
        has_perm = await check_permission(db, current_user.id, resource_id, PermissionType.WRITE)
        if not has_perm:
            raise HTTPException(status_code=403, detail="Permission denied")

    # 查找资源
    result = await db.execute(
        select(Resource).options(selectinload(Resource.groups)).where(Resource.id == resource_id)
    )
    resource = result.scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="未找到该资源")
        
    # 更新字段
    update_data = resource_in.model_dump(exclude_unset=True)
    
    # Handle group_ids if present
    if 'group_ids' in update_data:
        group_ids = update_data.pop('group_ids')
        if group_ids is not None:
            # Fetch groups
            stmt = select(ResourceGroup).where(ResourceGroup.id.in_(group_ids))
            result = await db.execute(stmt)
            groups = result.scalars().all()
            resource.groups = list(groups)
    
    for field, value in update_data.items():
        setattr(resource, field, value)
        
    db.add(resource)
    await db.commit()
    await db.refresh(resource)

    # 记录操作日志
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        target_type="asset",
        target_id=str(resource.id),
        details=update_data,
        ip_address=request.client.host if request.client else None
    )

    # Re-fetch with relations
    result = await db.execute(
        select(Resource).options(selectinload(Resource.groups)).where(Resource.id == resource_id)
    )
    resource = result.scalars().first()

    return resource
