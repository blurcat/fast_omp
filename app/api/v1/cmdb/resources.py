import asyncio
import base64
from typing import Any, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.database import get_db
from app.models.cmdb import Resource, ResourcePermission, ResourceGroup, resource_groups_association, PermissionType
from app.models.credentials import Credential
from app.schemas.cmdb import ResourceCreate, ResourceResponse, ResourceUpdate, PaginatedResourceResponse
from app.core.audit import create_audit_log
from app.services.job_service import execute_ssh_command

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


@router.get("/", response_model=PaginatedResourceResponse)
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
    获取资源列表（分页）
    支持分页和多字段过滤，返回 `{ items, total }`
    """
    base_query = select(Resource)

    if not current_user.is_superuser:
        direct_perm_subq = select(ResourcePermission.resource_id).where(
            ResourcePermission.user_id == current_user.id,
            ResourcePermission.resource_id.isnot(None)
        )
        group_perm_subq = select(resource_groups_association.c.resource_id).select_from(
            resource_groups_association.join(
                ResourcePermission,
                resource_groups_association.c.group_id == ResourcePermission.group_id
            )
        ).where(ResourcePermission.user_id == current_user.id)
        base_query = base_query.where(
            or_(
                Resource.id.in_(direct_perm_subq),
                Resource.id.in_(group_perm_subq)
            )
        )

    if type:
        base_query = base_query.where(Resource.type == type)
    if category:
        base_query = base_query.where(Resource.category == category)
    if provider:
        base_query = base_query.where(Resource.provider == provider)
    if status:
        base_query = base_query.where(Resource.status == status)
    if name:
        base_query = base_query.where(Resource.name.ilike(f"%{name}%"))
    if ip_address:
        base_query = base_query.where(Resource.ip_address.ilike(f"%{ip_address}%"))
    if region:
        base_query = base_query.where(Resource.region.ilike(f"%{region}%"))
    if location:
        base_query = base_query.where(Resource.location.ilike(f"%{location}%"))
    if keyword:
        base_query = base_query.where(
            (Resource.name.ilike(f"%{keyword}%")) | (Resource.ip_address.ilike(f"%{keyword}%"))
        )
    if group_id:
        base_query = base_query.join(
            resource_groups_association,
            Resource.id == resource_groups_association.c.resource_id
        ).where(resource_groups_association.c.group_id == group_id)

    # COUNT query (same filters, no selectinload)
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0

    # Data query with relations
    data_query = base_query.options(selectinload(Resource.groups)).offset(skip).limit(limit)
    result = await db.execute(data_query)
    resources = result.scalars().all()

    return {"items": resources, "total": total}

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
    # 检查同一云厂商下 IP 是否已存在
    if resource_in.ip_address:
        dup = await db.execute(
            select(Resource).where(
                Resource.provider == resource_in.provider,
                Resource.ip_address == resource_in.ip_address,
            )
        )
        if dup.scalars().first():
            raise HTTPException(status_code=409, detail=f"该云厂商（{resource_in.provider}）下 IP {resource_in.ip_address} 已存在")

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
            # 异步环境下必须先 selectinload 加载关系，再赋值，否则触发懒加载报 MissingGreenlet
            res_result = await db.execute(
                select(Resource).options(selectinload(Resource.groups)).where(Resource.id == resource.id)
            )
            resource = res_result.scalars().first()
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

    # 检查更新后的 provider+ip 是否与其他资源重复
    new_provider = resource_in.provider if resource_in.provider is not None else resource.provider
    new_ip = resource_in.ip_address if resource_in.ip_address is not None else resource.ip_address
    if new_ip:
        dup = await db.execute(
            select(Resource).where(
                Resource.provider == new_provider,
                Resource.ip_address == new_ip,
                Resource.id != resource_id,
            )
        )
        if dup.scalars().first():
            raise HTTPException(status_code=409, detail=f"该云厂商（{new_provider}）下 IP {new_ip} 已存在")

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


class TestConnectionBody(BaseModel):
    port: Optional[int] = None  # 覆盖默认端口


_DB_DEFAULT_PORTS = {
    "mysql": 3306,
    "mariadb": 3306,
    "postgresql": 5432,
    "postgres": 5432,
    "redis": 6379,
    "mongodb": 27017,
    "mongo": 27017,
    "oracle": 1521,
    "mssql": 1433,
}


@router.post("/{resource_id}/test-connection")
async def test_resource_connection(
    resource_id: int,
    body: TestConnectionBody = Body(default_factory=TestConnectionBody),
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(deps.get_current_active_user),
) -> Any:
    """
    测试资产连通性

    请求体（可选）：`{ "port": 2222 }` 可覆盖默认端口。

    - **SSH 密码/密钥凭证**：通过 SSH 真实登录并执行 `hostname && uname -sr && uptime`
    - **数据库凭证**：TCP 端口可达性检测（不做认证，仅验证端口可达）
    - **无凭证**：TCP 端口可达检测（**仅验证网络连通性，不验证认证**）
    """
    res_result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = res_result.scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="未找到该资产")

    host = resource.ip_address
    if not host:
        raise HTTPException(status_code=400, detail="该资产未配置 IP 地址，无法测试连接")

    data_port = int(resource.data.get("port", 0)) if resource.data else 0

    # ---- 有凭证 ----
    if resource.credential_id:
        cred_result = await db.execute(select(Credential).where(Credential.id == resource.credential_id))
        credential = cred_result.scalars().first()
        if not credential:
            raise HTTPException(status_code=400, detail="关联凭证不存在，请重新绑定")
        if not credential.enabled:
            raise HTTPException(status_code=400, detail="关联凭证已禁用")

        secret = base64.b64decode(credential.encrypted_data.encode()).decode()
        cred_type = credential.type

        # SSH 真实登录测试
        if cred_type in ("ssh_password", "ssh_key"):
            port = body.port or data_port or 22
            result = await execute_ssh_command(
                host=host,
                port=port,
                username=credential.username or "root",
                password=secret if cred_type == "ssh_password" else None,
                private_key=secret if cred_type == "ssh_key" else None,
                command="hostname && uname -sr && uptime",
                timeout=15,
            )
            return {
                "success": result["success"],
                "host": host,
                "port": port,
                "credential_name": credential.name,
                "method": "SSH 认证登录",
                "output": result.get("stdout", "").strip() if result["success"] else None,
                "error": result.get("stderr", "").strip() if not result["success"] else None,
            }

        # 数据库 TCP 端口测试
        if cred_type == "database":
            resource_type_lower = resource.type.lower()
            default_port = next(
                (v for k, v in _DB_DEFAULT_PORTS.items() if k in resource_type_lower), 3306
            )
            port = body.port or data_port or default_port
            try:
                _, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=5)
                writer.close()
                return {
                    "success": True,
                    "host": host,
                    "port": port,
                    "credential_name": credential.name,
                    "method": "TCP 端口检测",
                    "output": f"数据库端口 {port} 可达（凭证：{credential.name}）",
                    "warning": "仅检测端口可达性，未验证数据库账号密码",
                }
            except Exception as e:
                return {
                    "success": False,
                    "host": host,
                    "port": port,
                    "credential_name": credential.name,
                    "method": "TCP 端口检测",
                    "error": str(e),
                }

        return {"success": False, "error": f"不支持测试凭证类型：{cred_type}"}

    # ---- 无凭证：TCP Ping 仅检测网络连通性 ----
    port = body.port or data_port or 22
    try:
        _, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=5)
        writer.close()
        return {
            "success": True,
            "host": host,
            "port": port,
            "method": "TCP 端口检测",
            "output": f"端口 {port} 网络可达",
            "warning": "未绑定凭证，仅检测网络连通性，不代表可以登录",
        }
    except Exception as e:
        return {"success": False, "host": host, "port": port, "method": "TCP 端口检测", "error": str(e)}
