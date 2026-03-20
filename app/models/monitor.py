import enum
from sqlalchemy import String, Float, Boolean, Integer, ForeignKey, Table, Column, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertStatus(str, enum.Enum):
    FIRING = "firing"
    RESOLVED = "resolved"
    ACKNOWLEDGED = "acknowledged"


class ChannelType(str, enum.Enum):
    DINGTALK = "dingtalk"
    WEBHOOK = "webhook"
    EMAIL = "email"


# Association table for AlertRule <-> AlertChannel
rule_channel_association = Table(
    "monitor_rule_channels",
    Base.metadata,
    Column("rule_id", Integer, ForeignKey("monitor_alert_rules.id"), primary_key=True),
    Column("channel_id", Integer, ForeignKey("monitor_alert_channels.id"), primary_key=True),
)


class AlertChannel(Base, TimestampMixin):
    """告警通知渠道"""
    __tablename__ = "monitor_alert_channels"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="渠道名称")
    type: Mapped[str] = mapped_column(String(20), nullable=False, comment="渠道类型: dingtalk/webhook/email")
    config: Mapped[dict] = mapped_column(
        __import__("sqlalchemy").JSON, default={}, comment="渠道配置(webhook_url/token/emails)"
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    description: Mapped[str] = mapped_column(String(500), nullable=True, comment="描述")

    rules: Mapped[list["AlertRule"]] = relationship(
        secondary=rule_channel_association, back_populates="channels"
    )


class AlertRule(Base, TimestampMixin):
    """告警规则"""
    __tablename__ = "monitor_alert_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="规则名称")
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("cmdb_resources.id"), nullable=True, comment="绑定资源")
    group_id: Mapped[int] = mapped_column(ForeignKey("cmdb_resource_groups.id"), nullable=True, comment="绑定资源组")
    metric: Mapped[str] = mapped_column(String(100), nullable=False, comment="指标名: cpu_usage/mem_usage/disk_usage")
    operator: Mapped[str] = mapped_column(String(10), nullable=False, comment="比较符: >/</>=/<=/==")
    threshold: Mapped[float] = mapped_column(Float, nullable=False, comment="阈值")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=5, comment="持续时间(分钟)")
    severity: Mapped[str] = mapped_column(String(20), default=AlertSeverity.WARNING, comment="严重级别")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    channels: Mapped[list["AlertChannel"]] = relationship(
        secondary=rule_channel_association, back_populates="rules"
    )
    events: Mapped[list["AlertEvent"]] = relationship(back_populates="rule")


class AlertEvent(Base, TimestampMixin):
    """告警事件"""
    __tablename__ = "monitor_alert_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rule_id: Mapped[int] = mapped_column(ForeignKey("monitor_alert_rules.id"), nullable=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("cmdb_resources.id"), nullable=True)
    resource_name: Mapped[str] = mapped_column(String(200), nullable=True)
    metric: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default=AlertSeverity.WARNING)
    status: Mapped[str] = mapped_column(String(20), default=AlertStatus.FIRING)
    started_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=False
    )
    resolved_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )
    acknowledged_by: Mapped[str] = mapped_column(String(100), nullable=True)
    acknowledged_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True), nullable=True
    )

    rule: Mapped["AlertRule"] = relationship(back_populates="events")


class MetricRecord(Base):
    """指标数据记录"""
    __tablename__ = "monitor_metrics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("cmdb_resources.id"), index=True, nullable=False)
    resource_name: Mapped[str] = mapped_column(String(200), nullable=True)
    metric: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=True)
    collected_at: Mapped[__import__("datetime").datetime] = mapped_column(
        __import__("sqlalchemy").DateTime(timezone=True),
        server_default=__import__("sqlalchemy").func.now(),
        nullable=False,
        index=True
    )
