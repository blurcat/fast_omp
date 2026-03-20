from typing import Any, Dict, Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator
from datetime import datetime

# --- Role Schemas ---
class RoleBase(BaseModel):
    """角色基础模型"""
    name: str
    description: Optional[str] = None
    permissions: Dict[str, Any] = Field(default_factory=dict)

class RoleCreate(RoleBase):
    """角色创建模型"""
    pass

class RoleUpdate(RoleBase):
    """角色更新模型"""
    name: Optional[str] = None

class RoleResponse(RoleBase):
    """角色响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Menu Schemas ---
class MenuBase(BaseModel):
    """菜单基础模型"""
    title: str
    icon: Optional[str] = None
    path: Optional[str] = None
    order: int = 0
    parent_id: Optional[int] = None

class MenuCreate(MenuBase):
    """菜单创建模型"""
    pass

class MenuUpdate(MenuBase):
    """菜单更新模型"""
    title: Optional[str] = None

class MenuResponse(MenuBase):
    """菜单响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime
    children: List["MenuResponse"] = []
    
    @field_validator('children', mode='before')
    @classmethod
    def default_children(cls, v):
        return v or []

    model_config = ConfigDict(from_attributes=True)

# --- User Schemas ---
class UserBase(BaseModel):
    """用户基础模型"""
    username: str
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    role_id: Optional[int] = None

class UserCreate(UserBase):
    """用户创建模型"""
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("密码长度不少于8位")
        return v

class UserUpdate(UserBase):
    """用户更新模型"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    """用户响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime
    role: Optional[RoleResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Auth Schemas ---
class Token(BaseModel):
    """Token 响应模型"""
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    """Token 载荷模型"""
    sub: Optional[str] = None


class MessageResponse(BaseModel):
    message: str
