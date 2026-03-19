from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from app.models.cmdb import PermissionType

# --- Resource Group Schemas ---
class ResourceGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class ResourceGroupCreate(ResourceGroupBase):
    pass

class ResourceGroupUpdate(ResourceGroupBase):
    name: Optional[str] = None

class ResourceGroupResponse(ResourceGroupBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Resource Permission Schemas ---
class ResourcePermissionBase(BaseModel):
    user_id: int
    resource_id: Optional[int] = None
    group_id: Optional[int] = None
    permission: PermissionType = PermissionType.READ

class ResourcePermissionCreate(ResourcePermissionBase):
    pass

class ResourcePermissionResponse(ResourcePermissionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ResourceBase(BaseModel):
    """资源基础模型"""
    name: str
    type: str
    category: Optional[str] = None
    provider: str
    region: Optional[str] = None
    ip_address: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: str = "unknown"
    business_unit: Optional[str] = None
    owner: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    tags: Dict[str, Any] = Field(default_factory=dict)

class ResourceCreate(ResourceBase):
    """资源创建模型"""
    group_ids: Optional[List[int]] = None

class ResourceUpdate(ResourceBase):
    """资源更新模型"""
    name: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    provider: Optional[str] = None
    region: Optional[str] = None
    ip_address: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    business_unit: Optional[str] = None
    owner: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    tags: Optional[Dict[str, Any]] = None
    group_ids: Optional[List[int]] = None

class ResourceResponse(ResourceBase):
    """资源响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime
    # Use string forward reference if we want to include groups here
    # But for now let's keep it simple and just use ResourceGroupResponse (which doesn't have resources)
    groups: List[ResourceGroupResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

class ResourceGroupDetailResponse(ResourceGroupResponse):
    resources: List[ResourceResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
