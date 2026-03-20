from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class JobTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    script: str
    timeout: int = 300
    parameters: Dict[str, Any] = {}
    tags: List[str] = []
    enabled: bool = True


class JobTemplateCreate(JobTemplateBase):
    pass


class JobTemplateUpdate(JobTemplateBase):
    name: Optional[str] = None
    script: Optional[str] = None


class JobTemplateResponse(JobTemplateBase):
    id: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class JobLogResponse(BaseModel):
    id: int
    execution_id: int
    resource_id: Optional[int] = None
    host: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class JobExecutionCreate(BaseModel):
    template_id: Optional[int] = None
    name: str
    script: str
    targets: List[int] = []  # resource_ids
    parameters: Dict[str, Any] = {}


class JobExecutionResponse(BaseModel):
    id: int
    template_id: Optional[int] = None
    name: str
    script: str
    targets: List[int] = []
    parameters: Dict[str, Any] = {}
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_by: Optional[str] = None
    summary: Dict[str, Any] = {}
    logs: List[JobLogResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
