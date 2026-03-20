from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class CredentialBase(BaseModel):
    name: str
    type: str  # ssh_password/ssh_key/api_token/database
    username: Optional[str] = None
    description: Optional[str] = None
    resource_ids: List[int] = []
    enabled: bool = True


class CredentialCreate(CredentialBase):
    secret: str  # raw secret before encryption


class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    description: Optional[str] = None
    resource_ids: Optional[List[int]] = None
    enabled: Optional[bool] = None
    secret: Optional[str] = None


class CredentialResponse(CredentialBase):
    id: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Never return encrypted_data
    model_config = ConfigDict(from_attributes=True)
