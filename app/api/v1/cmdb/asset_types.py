from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.cmdb import ResourceType
from app.schemas.cmdb import ResourceTypeCreate, ResourceTypeUpdate, ResourceTypeResponse
from app.core.audit import create_audit_log

router = APIRouter()


@router.get("/", response_model=List[ResourceTypeResponse])
async def list_asset_types(
    db: AsyncSession = Depends(get_db),
    name: Optional[str] = None,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """
    获取资产类型列表，内置类型排在前面
    """
    query = select(ResourceType).order_by(ResourceType.is_builtin.desc(), ResourceType.id)
    if name:
        query = query.where(ResourceType.name.ilike(f"%{name}%"))
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ResourceTypeResponse)
async def create_asset_type(
    *,
    db: AsyncSession = Depends(get_db),
    type_in: ResourceTypeCreate,
    current_user=Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    创建资产类型。`value` 为唯一标识符（如 `host`），`name` 为显示名称（如「主机」）。
    """
    dup = await db.execute(select(ResourceType).where(ResourceType.value == type_in.value))
    if dup.scalars().first():
        raise HTTPException(status_code=409, detail=f"类型代码 '{type_in.value}' 已存在")

    asset_type = ResourceType(
        name=type_in.name,
        value=type_in.value,
        description=type_in.description,
        is_builtin=False,
    )
    db.add(asset_type)
    await db.commit()
    await db.refresh(asset_type)

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        target_type="asset_type",
        target_id=str(asset_type.id),
        details=type_in.model_dump(),
        ip_address=request.client.host if request.client else None,
    )
    return asset_type


@router.put("/{type_id}", response_model=ResourceTypeResponse)
async def update_asset_type(
    *,
    db: AsyncSession = Depends(get_db),
    type_id: int,
    type_in: ResourceTypeUpdate,
    current_user=Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    更新资产类型的显示名称或描述。内置类型也可修改名称。
    """
    result = await db.execute(select(ResourceType).where(ResourceType.id == type_id))
    asset_type = result.scalars().first()
    if not asset_type:
        raise HTTPException(status_code=404, detail="未找到该资产类型")

    if type_in.name is not None:
        asset_type.name = type_in.name
    if type_in.description is not None:
        asset_type.description = type_in.description

    db.add(asset_type)
    await db.commit()
    await db.refresh(asset_type)

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        target_type="asset_type",
        target_id=str(type_id),
        details=type_in.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None,
    )
    return asset_type


@router.delete("/{type_id}")
async def delete_asset_type(
    *,
    db: AsyncSession = Depends(get_db),
    type_id: int,
    current_user=Depends(deps.get_current_active_user),
    request: Request,
) -> Any:
    """
    删除资产类型。内置类型不可删除。删除后已使用该类型的资产数据不受影响。
    """
    result = await db.execute(select(ResourceType).where(ResourceType.id == type_id))
    asset_type = result.scalars().first()
    if not asset_type:
        raise HTTPException(status_code=404, detail="未找到该资产类型")
    if asset_type.is_builtin:
        raise HTTPException(status_code=400, detail="内置类型不可删除")

    type_name = asset_type.name
    type_value = asset_type.value
    await db.delete(asset_type)
    await db.commit()

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        target_type="asset_type",
        target_id=str(type_id),
        details={"name": type_name, "value": type_value},
        ip_address=request.client.host if request.client else None,
    )
    return {"message": f"资产类型 '{type_name}' 已删除"}
