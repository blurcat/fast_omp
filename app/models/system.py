from sqlalchemy import String, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

class Role(Base, TimestampMixin):
    """
    系统角色表
    用于 RBAC 权限控制
    """
    __tablename__ = "sys_roles"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, comment="角色ID")
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="角色名称")
    description: Mapped[str] = mapped_column(String(200), nullable=True, comment="角色描述")
    permissions: Mapped[dict] = mapped_column(JSON, default={}, comment="权限集合(JSON格式)")  # e.g. {"resource": ["read", "write"]}
    
    # 关联关系
    users: Mapped[list["User"]] = relationship(back_populates="role")

class User(Base, TimestampMixin):
    """
    系统用户表
    """
    __tablename__ = "sys_users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, comment="用户ID")
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, comment="用户名")
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, comment="邮箱")
    hashed_password: Mapped[str] = mapped_column(String(255), comment="加密后的密码")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否激活")
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否为超级管理员")
    
    # 外键关联
    role_id: Mapped[int] = mapped_column(ForeignKey("sys_roles.id"), nullable=True, comment="角色ID")
    role: Mapped["Role"] = relationship(back_populates="users")

class Menu(Base, TimestampMixin):
    """
    系统菜单表
    用于动态生成前端菜单
    """
    __tablename__ = "sys_menus"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, comment="菜单ID")
    parent_id: Mapped[int] = mapped_column(ForeignKey("sys_menus.id"), nullable=True, comment="父菜单ID")
    title: Mapped[str] = mapped_column(String(50), comment="菜单标题")
    icon: Mapped[str] = mapped_column(String(50), nullable=True, comment="菜单图标")
    path: Mapped[str] = mapped_column(String(100), nullable=True, comment="前端路由路径")
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序权重")
    
    # 关联关系
    children: Mapped[list["Menu"]] = relationship("Menu", backref="parent", remote_side=[id])
