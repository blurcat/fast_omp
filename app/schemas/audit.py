from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

class AuditLogBase(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None

class AuditLogResponse(AuditLogBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
