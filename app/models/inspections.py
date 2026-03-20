import enum
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class InspectionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class InspectionTemplate(Base, TimestampMixin):
    """巡检模板"""
    __tablename__ = "inspection_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="模板名称")
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    script: Mapped[str] = mapped_column(Text, nullable=True, comment="巡检脚本")
    items: Mapped[list] = mapped_column(__import__("sqlalchemy").JSON, default=[], comment="巡检项目列表")
    schedule: Mapped[str] = mapped_column(String(100), nullable=True, comment="Cron表达式")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(100), nullable=True)

    tasks: Mapped[list["InspectionTask"]] = relationship(back_populates="template")


class InspectionTask(Base, TimestampMixin):
    """巡检任务"""
    __tablename__ = "inspection_tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("inspection_templates.id"), nullable=True, comment="关联模板ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    targets: Mapped[list] = mapped_column(__import__("sqlalchemy").JSON, default=[], comment="目标资产ID列表")
    status: Mapped[str] = mapped_column(String(20), default=InspectionStatus.PENDING, index=True)
    scheduled_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )
    started_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )
    finished_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )
    report: Mapped[dict] = mapped_column(__import__("sqlalchemy").JSON, default={}, comment="巡检报告")
    created_by: Mapped[str] = mapped_column(String(100), nullable=True)

    template: Mapped["InspectionTemplate"] = relationship(back_populates="tasks")
