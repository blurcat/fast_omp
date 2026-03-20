from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ChangeRequestBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: str = "normal"
    risk_level: str = "medium"
    resource_ids: List[int] = []
    plan: Optional[str] = None
    rollback_plan: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class ChangeRequestCreate(ChangeRequestBase):
    pass


class ChangeRequestUpdate(ChangeRequestBase):
    title: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ChangeRequestResponse(ChangeRequestBase):
    id: int
    status: str
    created_by: Optional[str] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
