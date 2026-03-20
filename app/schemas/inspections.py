from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class InspectionTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    script: Optional[str] = None
    items: List[Dict[str, Any]] = []
    schedule: Optional[str] = None
    enabled: bool = True


class InspectionTemplateCreate(InspectionTemplateBase):
    pass


class InspectionTemplateUpdate(InspectionTemplateBase):
    name: Optional[str] = None


class InspectionTemplateResponse(InspectionTemplateBase):
    id: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InspectionTaskCreate(BaseModel):
    template_id: Optional[int] = None
    name: str
    targets: List[int] = []
    scheduled_at: Optional[datetime] = None


class InspectionTaskResponse(BaseModel):
    id: int
    template_id: Optional[int] = None
    name: str
    targets: List[int] = []
    status: str
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    report: Dict[str, Any] = {}
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
