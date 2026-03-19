from collections import defaultdict
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api import deps
from app.core.database import get_db
from app.models.system import Menu, User
from app.schemas.system import MenuCreate, MenuResponse, MenuUpdate
from app.core.audit import create_audit_log

router = APIRouter()

def build_menu_tree(menus: List[Menu]) -> List[MenuResponse]:
    """
    构建菜单树（O(n) 实现）
    先按 parent_id 分组，再递归构建，避免 O(n²) 的嵌套遍历
    """
    # 按 parent_id 分组
    children_map: Dict[Optional[int], List[Menu]] = defaultdict(list)
    for menu in menus:
        children_map[menu.parent_id].append(menu)

    def build_subtree(parent_id: Optional[int]) -> List[MenuResponse]:
        nodes = sorted(children_map.get(parent_id, []), key=lambda m: m.order)
        result = []
        for menu in nodes:
            menu_dict = {
                "id": menu.id,
                "title": menu.title,
                "icon": menu.icon,
                "path": menu.path,
                "order": menu.order,
                "parent_id": menu.parent_id,
                "created_at": menu.created_at,
                "updated_at": menu.updated_at,
                "children": build_subtree(menu.id),
            }
            result.append(MenuResponse(**menu_dict))
        return result

    return build_subtree(None)

@router.get("/", response_model=List[MenuResponse])
async def read_menus(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取菜单列表 (树形结构)
    根据用户权限过滤，超级管理员返回全部菜单
    """
    if current_user.is_superuser:
        result = await db.execute(select(Menu))
        allowed_menus = result.scalars().all()
    else:
        if not current_user.role:
            return []
        permissions = current_user.role.permissions or {}
        allowed_ids = permissions.get("menu_ids", [])
        if not allowed_ids:
            return []
        # 在 SQL 层过滤，避免全量加载后在 Python 层过滤
        result = await db.execute(select(Menu).where(Menu.id.in_(allowed_ids)))
        allowed_menus = result.scalars().all()

    return build_menu_tree(list(allowed_menus))

@router.post("/", response_model=MenuResponse)
async def create_menu(
    *,
    db: AsyncSession = Depends(get_db),
    menu_in: MenuCreate,
    current_user: User = Depends(deps.get_current_superuser),
    request: Request,
) -> Any:
    """
    创建新菜单
    仅超级管理员
    """
    menu = Menu(
        title=menu_in.title,
        icon=menu_in.icon,
        path=menu_in.path,
        order=menu_in.order,
        parent_id=menu_in.parent_id,
    )
    db.add(menu)
    await db.commit()
    await db.refresh(menu)

    # 记录操作日志
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        target_type="menu",
        target_id=str(menu.id),
        details=menu_in.model_dump(),
        ip_address=request.client.host if request.client else None
    )

    return menu

@router.put("/{menu_id}", response_model=MenuResponse)
async def update_menu(
    *,
    db: AsyncSession = Depends(get_db),
    menu_id: int,
    menu_in: MenuUpdate,
    current_user: User = Depends(deps.get_current_superuser),
    request: Request,
) -> Any:
    """
    更新菜单
    仅超级管理员
    """
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    menu = result.scalars().first()
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存在")

    update_data = menu_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(menu, field, value)

    db.add(menu)
    await db.commit()
    await db.refresh(menu)

    # 记录操作日志
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        target_type="menu",
        target_id=str(menu.id),
        details=update_data,
        ip_address=request.client.host if request.client else None
    )

    return menu

@router.delete("/{menu_id}")
async def delete_menu(
    *,
    db: AsyncSession = Depends(get_db),
    menu_id: int,
    current_user: User = Depends(deps.get_current_superuser),
    request: Request,
) -> Any:
    """
    删除菜单
    仅超级管理员
    """
    result = await db.execute(select(Menu).where(Menu.id == menu_id))
    menu = result.scalars().first()
    if not menu:
        raise HTTPException(status_code=404, detail="菜单不存在")

    # 用 SQL COUNT 检查子菜单，避免触发 ORM 懒加载（异步环境下不安全）
    child_count_result = await db.execute(
        select(func.count(Menu.id)).where(Menu.parent_id == menu_id)
    )
    if child_count_result.scalar() > 0:
        raise HTTPException(status_code=400, detail="请先删除子菜单")

    # 在 delete+commit 前保存所需数据，commit 后 ORM 对象属性会过期
    menu_id_str = str(menu.id)
    menu_title = menu.title

    await db.delete(menu)
    await db.commit()

    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        target_type="menu",
        target_id=menu_id_str,
        details={"title": menu_title},
        ip_address=request.client.host if request.client else None
    )

    return {"status": "success"}
