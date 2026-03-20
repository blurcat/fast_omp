import enum
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class ChangeType(str, enum.Enum):
    NORMAL = "normal"
    EMERGENCY = "emergency"
    STANDARD = "standard"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ChangeStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTING = "executing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ChangeRequest(Base, TimestampMixin):
    """变更请求"""
    __tablename__ = "change_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, comment="变更标题")
    description: Mapped[str] = mapped_column(Text, nullable=True, comment="变更描述")
    type: Mapped[str] = mapped_column(String(20), default=ChangeType.NORMAL, comment="变更类型")
    risk_level: Mapped[str] = mapped_column(String(20), default=RiskLevel.MEDIUM, comment="风险级别")
    resource_ids: Mapped[list] = mapped_column(
        __import__("sqlalchemy").JSON, default=[], comment="涉及资产ID列表"
    )
    plan: Mapped[str] = mapped_column(Text, nullable=True, comment="变更方案")
    rollback_plan: Mapped[str] = mapped_column(Text, nullable=True, comment="回滚方案")
    scheduled_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True, comment="计划执行时间"
    )
    status: Mapped[str] = mapped_column(String(20), default=ChangeStatus.DRAFT, index=True)
    created_by: Mapped[str] = mapped_column(String(100), nullable=True, comment="创建人")
    created_by_id: Mapped[int] = mapped_column(ForeignKey("sys_users.id"), nullable=True)
    approver_id: Mapped[int] = mapped_column(ForeignKey("sys_users.id"), nullable=True, comment="审批人")
    approver_name: Mapped[str] = mapped_column(String(100), nullable=True)
    approved_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str] = mapped_column(Text, nullable=True, comment="备注/审批意见")
