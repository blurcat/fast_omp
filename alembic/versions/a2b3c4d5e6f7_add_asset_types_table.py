"""add_asset_types_table

Revision ID: a2b3c4d5e6f7
Revises: f7b8c9d0e1f2
Create Date: 2026-03-20 18:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cmdb_resource_types',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(50), nullable=False, comment='类型显示名称'),
        sa.Column('value', sa.String(50), nullable=False, unique=True, index=True, comment='类型代码'),
        sa.Column('description', sa.String(200), nullable=True, comment='类型说明'),
        sa.Column('is_builtin', sa.Boolean(), server_default='false', nullable=False, comment='是否内置'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # Seed built-in types
    op.bulk_insert(
        sa.table(
            'cmdb_resource_types',
            sa.column('name', sa.String),
            sa.column('value', sa.String),
            sa.column('description', sa.String),
            sa.column('is_builtin', sa.Boolean),
        ),
        [
            {'name': '主机', 'value': 'host', 'description': '物理机或虚拟机', 'is_builtin': True},
            {'name': '数据库', 'value': 'database', 'description': '关系型或非关系型数据库实例', 'is_builtin': True},
            {'name': '中间件', 'value': 'middleware', 'description': '消息队列、缓存等中间件', 'is_builtin': True},
            {'name': '网络设备', 'value': 'network', 'description': '交换机、路由器、防火墙等', 'is_builtin': True},
        ],
    )


def downgrade() -> None:
    op.drop_table('cmdb_resource_types')
