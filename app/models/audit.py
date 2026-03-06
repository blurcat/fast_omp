from typing import Optional
from sqlalchemy import String, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class AuditLog(Base, TimestampMixin):
    """
    操作日志表
    记录用户对资源的操作
    """
    __tablename__ = "sys_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=True, comment="用户ID")
    username: Mapped[str] = mapped_column(String(50), index=True, nullable=True, comment="用户名")
    action: Mapped[str] = mapped_column(String(50), index=True, comment="操作类型: create/update/delete")
    target_type: Mapped[str] = mapped_column(String(50), index=True, comment="目标类型: asset/menu/role...")
    target_id: Mapped[str] = mapped_column(String(50), index=True, nullable=True, comment="目标ID")
    details: Mapped[dict] = mapped_column(JSON, nullable=True, comment="操作详情")
    ip_address: Mapped[str] = mapped_column(String(50), nullable=True, comment="操作IP")
