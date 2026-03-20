import enum
from sqlalchemy import String, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class CredentialType(str, enum.Enum):
    SSH_PASSWORD = "ssh_password"
    SSH_KEY = "ssh_key"
    API_TOKEN = "api_token"
    DATABASE = "database"


class Credential(Base, TimestampMixin):
    """凭证管理（加密存储）"""
    __tablename__ = "credentials"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, comment="凭证名称")
    type: Mapped[str] = mapped_column(String(30), nullable=False, comment="凭证类型")
    username: Mapped[str] = mapped_column(String(100), nullable=True, comment="用户名")
    encrypted_data: Mapped[str] = mapped_column(Text, nullable=False, comment="加密后的凭证数据")
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    resource_ids: Mapped[list] = mapped_column(
        __import__("sqlalchemy").JSON, default=[], comment="关联资产ID列表"
    )
    created_by: Mapped[str] = mapped_column(String(100), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
