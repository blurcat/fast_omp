from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.cmdb import Resource
from app.schemas.cmdb import ResourceCreate, ResourceResponse, ResourceUpdate
from app.core.audit import create_audit_log

from sqlalchemy import select, func

# ... imports ...

router = APIRouter()

@router.get("/stats")
async def get_resource_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取资产统计信息
    """
    # 按类型统计
    type_stats = await db.execute(
        select(Resource.type, func.count(Resource.id)).group_by(Resource.type)
    )
    type_data = [{"type": row[0], "count": row[1]} for row in type_stats.all()]
    
    # 按云厂商统计
    provider_stats = await db.execute(
        select(Resource.provider, func.count(Resource.id)).group_by(Resource.provider)
    )
    provider_data = [{"provider": row[0], "count": row[1]} for row in provider_stats.all()]
    
    return {
        "type_stats": type_data,
        "provider_stats": provider_data
    }

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
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取资源列表
    支持分页和过滤
    """
    query = select(Resource)
    
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

    return resource

@router.delete("/{resource_id}", response_model=ResourceResponse)
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
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="未找到该资源")
        
    await db.delete(resource)
    await db.commit()

    # 记录操作日志
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        target_type="asset",
        target_id=str(resource.id),
        details={"name": resource.name},
        ip_address=request.client.host if request.client else None
    )

    return resource

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
    # 查找资源
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="未找到该资源")
        
    # 更新字段
    update_data = resource_in.model_dump(exclude_unset=True)
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

    return resource
