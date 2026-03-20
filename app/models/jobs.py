import enum
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobTemplate(Base, TimestampMixin):
    """作业模板"""
    __tablename__ = "job_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True, comment="模板名称")
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    script: Mapped[str] = mapped_column(Text, nullable=False, comment="执行脚本内容")
    timeout: Mapped[int] = mapped_column(Integer, default=300, comment="超时时间(秒)")
    parameters: Mapped[dict] = mapped_column(__import__("sqlalchemy").JSON, default={}, comment="参数定义(JSON Schema)")
    tags: Mapped[list] = mapped_column(__import__("sqlalchemy").JSON, default=[], comment="标签")
    created_by: Mapped[str] = mapped_column(String(100), nullable=True, comment="创建人")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    executions: Mapped[list["JobExecution"]] = relationship(back_populates="template")


class JobExecution(Base, TimestampMixin):
    """作业执行记录"""
    __tablename__ = "job_executions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("job_templates.id"), nullable=True, comment="关联模板")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="执行名称")
    script: Mapped[str] = mapped_column(Text, nullable=False, comment="实际执行脚本")
    targets: Mapped[list] = mapped_column(__import__("sqlalchemy").JSON, default=[], comment="目标主机列表(resource_ids)")
    parameters: Mapped[dict] = mapped_column(__import__("sqlalchemy").JSON, default={}, comment="执行参数")
    status: Mapped[str] = mapped_column(String(20), default=JobStatus.PENDING)
    started_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[str] = mapped_column(String(100), nullable=True)
    summary: Mapped[dict] = mapped_column(__import__("sqlalchemy").JSON, default={}, comment="执行摘要(成功/失败数)")

    template: Mapped["JobTemplate"] = relationship(back_populates="executions")
    logs: Mapped[list["JobLog"]] = relationship(back_populates="execution", cascade="all, delete-orphan")


class JobLog(Base):
    """单台主机的执行日志"""
    __tablename__ = "job_execution_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    execution_id: Mapped[int] = mapped_column(ForeignKey("job_executions.id"), index=True, nullable=False)
    resource_id: Mapped[int] = mapped_column(Integer, nullable=True, comment="目标资源ID")
    host: Mapped[str] = mapped_column(String(100), nullable=True, comment="目标主机IP")
    stdout: Mapped[str] = mapped_column(Text, nullable=True)
    stderr: Mapped[str] = mapped_column(Text, nullable=True)
    exit_code: Mapped[int] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    started_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )

    execution: Mapped["JobExecution"] = relationship(back_populates="logs")
