from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.database import get_db
from app.models.system import Menu, User
from app.schemas.system import MenuCreate, MenuResponse, MenuUpdate
from app.core.audit import create_audit_log

router = APIRouter()

def build_menu_tree(menus: List[Menu], parent_id: int | None = None) -> List[MenuResponse]:
    """
    递归构建菜单树
    """
    tree = []
    for menu in menus:
        # 如果当前菜单的父ID匹配
        if menu.parent_id == parent_id:
            # 创建响应对象 (转换为 Pydantic 模型以便处理 children)
            # 注意：这里我们手动构建 children，所以先转为 dict 或直接使用 ORM 对象
            # 但为了类型安全和避免 ORM 懒加载问题，最好转为 dict 或 Pydantic
            # 这里简单起见，我们递归查找子节点
            children = build_menu_tree(menus, menu.id)
            
            # 使用 MenuResponse.model_validate 将 ORM 对象转换为 Pydantic 模型
            # 但我们需要先处理 children。MenuResponse 的 children 字段默认是 list
            # 我们不能直接修改 ORM 对象的 children (因为它是 relationship)
            # 所以我们需要构造一个新的对象或者 dict
            
            menu_dict = {
                "id": menu.id,
                "title": menu.title,
                "icon": menu.icon,
                "path": menu.path,
                "order": menu.order,
                "parent_id": menu.parent_id,
                "created_at": menu.created_at,
                "updated_at": menu.updated_at,
                "children": children
            }
            tree.append(MenuResponse(**menu_dict))
            
    # 按 order 排序
    tree.sort(key=lambda x: x.order)
    return tree

@router.get("/", response_model=List[MenuResponse])
async def read_menus(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    获取菜单列表 (树形结构)
    根据用户权限过滤
    """
    # 查询所有菜单
    result = await db.execute(select(Menu))
    all_menus = result.scalars().all()
    
    # 过滤菜单
    if current_user.is_superuser:
        allowed_menus = all_menus
    else:
        # 检查用户角色和权限
        if not current_user.role:
            return []
            
        # 获取允许的菜单 ID 列表
        # 假设 permissions 结构为 {"menu_ids": [1, 2, 3]}
        # 如果 permissions 为空或没有 menu_ids，则无权限
        permissions = current_user.role.permissions or {}
        allowed_ids = permissions.get("menu_ids", [])
        
        if not allowed_ids:
            return []
            
        # 过滤
        allowed_menus = [m for m in all_menus if m.id in allowed_ids]
        
    # 构建树形结构
    # 注意：如果子菜单被选中但父菜单未被选中，构建树时子菜单可能无法挂载到父菜单上
    # 逻辑上，前端选择权限时应该级联选择父菜单
    # 这里我们只构建 parent_id 为 None 的顶级菜单作为入口，然后递归
    # 如果父菜单不在 allowed_menus 中，子菜单将不会显示（因为递归是从顶级开始找）
    # 这符合通常的菜单逻辑：没有父菜单权限通常也看不到子菜单
    
    menu_tree = build_menu_tree(allowed_menus, None)
    
    # 分页 (对顶级菜单分页)
    if skip > 0 or limit < 100:
        return menu_tree[skip : skip + limit]
        
    return menu_tree

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

    # 检查是否有子菜单
    # 注意：这里可能需要更严谨的检查，或者级联删除
    # 简单起见，如果有子菜单则阻止删除
    if menu.children:
        raise HTTPException(status_code=400, detail="请先删除子菜单")

    await db.delete(menu)
    await db.commit()

    # 记录操作日志
    await create_audit_log(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        target_type="menu",
        target_id=str(menu.id),
        details={"title": menu.title},
        ip_address=request.client.host if request.client else None
    )

    return {"status": "success"}
