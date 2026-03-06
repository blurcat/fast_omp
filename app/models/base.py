from typing import Any
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func

class Base(DeclarativeBase):
    """
    SQLAlchemy 声明式基类
    所有数据库模型都应继承此类
    """
    id: Any
    __name__: str
    
    # 自动生成表名 (类名小写)
    @property
    def __tablename__(cls) -> str:
        return cls.__name__.lower()

class TimestampMixin:
    """
    时间戳混入类
    为模型自动添加 created_at 和 updated_at 字段
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False,
        comment="更新时间"
    )
