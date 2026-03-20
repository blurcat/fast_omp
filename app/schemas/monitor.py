from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class AlertChannelBase(BaseModel):
    name: str
    type: str  # dingtalk/webhook/email
    config: Dict[str, Any] = {}
    enabled: bool = True
    description: Optional[str] = None


class AlertChannelCreate(AlertChannelBase):
    pass


class AlertChannelUpdate(AlertChannelBase):
    name: Optional[str] = None
    type: Optional[str] = None


class AlertChannelResponse(AlertChannelBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AlertRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    resource_id: Optional[int] = None
    group_id: Optional[int] = None
    metric: str
    operator: str  # >/</>=/<=/==
    threshold: float
    duration_minutes: int = 5
    severity: str = "warning"
    enabled: bool = True
    channel_ids: List[int] = []


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(AlertRuleBase):
    name: Optional[str] = None
    metric: Optional[str] = None
    operator: Optional[str] = None
    threshold: Optional[float] = None


class AlertRuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    resource_id: Optional[int] = None
    group_id: Optional[int] = None
    metric: str
    operator: str
    threshold: float
    duration_minutes: int
    severity: str
    enabled: bool
    channels: List[AlertChannelResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AlertEventBase(BaseModel):
    resource_id: Optional[int] = None
    resource_name: Optional[str] = None
    metric: str
    value: float
    threshold: float
    severity: str = "warning"
    status: str = "firing"


class AlertEventCreate(AlertEventBase):
    rule_id: Optional[int] = None
    started_at: datetime


class AlertEventResponse(AlertEventBase):
    id: int
    rule_id: Optional[int] = None
    started_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MetricRecordCreate(BaseModel):
    resource_id: int
    resource_name: Optional[str] = None
    metric: str
    value: float
    unit: Optional[str] = None


class MetricRecordResponse(MetricRecordCreate):
    id: int
    collected_at: datetime
    model_config = ConfigDict(from_attributes=True)
