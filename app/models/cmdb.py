from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class Resource(Base, TimestampMixin):
    """
    CMDB 资源表
    存储所有类型的云资源和本地资源
    """
    __tablename__ = "cmdb_resources"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True, comment="资源ID")
    name: Mapped[str] = mapped_column(String(255), index=True, comment="资源名称/实例名")
    
    # 资源类型: host, k8s_pod, rds_instance, etc.
    type: Mapped[str] = mapped_column(String(50), index=True, comment="资源类型")
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=True, comment="资源分类")
    
    # 核心属性
    ip_address: Mapped[str] = mapped_column(String(50), nullable=True, index=True, comment="IP地址")
    description: Mapped[str] = mapped_column(String(500), nullable=True, comment="描述")
    location: Mapped[str] = mapped_column(String(100), nullable=True, comment="物理位置")

    # 提供商: aws, aliyun, onprem, k8s
    provider: Mapped[str] = mapped_column(String(50), index=True, comment="资源提供商")
    
    # 区域或集群名称
    region: Mapped[str] = mapped_column(String(50), index=True, nullable=True, comment="区域/地域")
    
    # 状态: running, stopped, terminated
    status: Mapped[str] = mapped_column(String(50), default="unknown", comment="资源状态")

    # 业务属性
    business_unit: Mapped[str] = mapped_column(String(100), nullable=True, index=True, comment="业务线/部门")
    owner: Mapped[str] = mapped_column(String(50), nullable=True, index=True, comment="负责人")
    
    # 灵活的数据存储，不同资源类型字段不同
    data: Mapped[dict] = mapped_column(JSON, default={}, comment="资源详细规格数据(JSON)")
    tags: Mapped[dict] = mapped_column(JSON, default={}, comment="资源标签(JSON)")
