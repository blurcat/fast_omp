from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api import deps
from app.core.database import get_db
from app.models.system import Role, User
from app.schemas.system import RoleCreate, RoleResponse, RoleUpdate
from app.core.audit import create_audit_log

router = APIRouter()

@router.get("/", response_model=List[RoleResponse])
async def read_roles(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取角色列表
    """
    result = await db.execute(select(Role).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=RoleResponse)
async def create_role(
    *,
    db: AsyncSession = Depends(get_db),
    role_in: RoleCreate,
    current_user: User = Depends(deps.get_current_superuser),
    request: Request,
) -> Any:
    """
    创建角色
    """
    result = await db.execute(select(Role).where(Role.name == role_in.name))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="角色名称已存在")
    
    role = Role(**role_in.model_dump())
    db.add(role)
    await db.commit()
    await db.refresh(role)

    # 记录操作日志
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        target_type="role",
        target_id=str(role.id),
        details=role_in.model_dump(),
        ip_address=request.client.host if request.client else None
    )

    return role

@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    *,
    db: AsyncSession = Depends(get_db),
    role_id: int,
    role_in: RoleUpdate,
    current_user: User = Depends(deps.get_current_superuser),
    request: Request,
) -> Any:
    """
    更新角色
    """
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    update_data = role_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)
        
    db.add(role)
    await db.commit()
    await db.refresh(role)

    # 记录操作日志
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        target_type="role",
        target_id=str(role.id),
        details=update_data,
        ip_address=request.client.host if request.client else None
    )

    return role

@router.delete("/{role_id}")
async def delete_role(
    *,
    db: AsyncSession = Depends(get_db),
    role_id: int,
    current_user: User = Depends(deps.get_current_superuser),
    request: Request,
) -> Any:
    """
    删除角色
    """
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")

    # 检查是否有用户关联此角色，防止产生孤立用户
    user_count_result = await db.execute(
        select(func.count(User.id)).where(User.role_id == role_id)
    )
    if user_count_result.scalar() > 0:
        raise HTTPException(status_code=400, detail="该角色下仍有用户，请先解除用户与该角色的关联")

    # 在 delete+commit 前保存所需数据，commit 后 ORM 对象属性会过期
    role_id_str = str(role.id)
    role_name = role.name

    await db.delete(role)
    await db.commit()

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        target_type="role",
        target_id=role_id_str,
        details={"name": role_name},
        ip_address=request.client.host if request.client else None
    )

    return {"status": "success", "id": int(role_id_str), "name": role_name}
