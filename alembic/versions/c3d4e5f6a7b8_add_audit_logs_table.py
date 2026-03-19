"""add_audit_logs_table

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-03-19 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'sys_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True, comment='用户ID'),
        sa.Column('username', sa.String(50), nullable=True, comment='用户名'),
        sa.Column('action', sa.String(50), nullable=False, comment='操作类型: create/update/delete'),
        sa.Column('target_type', sa.String(50), nullable=False, comment='目标类型: asset/menu/role...'),
        sa.Column('target_id', sa.String(50), nullable=True, comment='目标ID'),
        sa.Column('details', sa.JSON(), nullable=True, comment='操作详情'),
        sa.Column('ip_address', sa.String(50), nullable=True, comment='操作IP'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_sys_audit_logs_id', 'sys_audit_logs', ['id'], unique=False)
    op.create_index('ix_sys_audit_logs_user_id', 'sys_audit_logs', ['user_id'], unique=False)
    op.create_index('ix_sys_audit_logs_username', 'sys_audit_logs', ['username'], unique=False)
    op.create_index('ix_sys_audit_logs_action', 'sys_audit_logs', ['action'], unique=False)
    op.create_index('ix_sys_audit_logs_target_type', 'sys_audit_logs', ['target_type'], unique=False)
    op.create_index('ix_sys_audit_logs_target_id', 'sys_audit_logs', ['target_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_sys_audit_logs_target_id', table_name='sys_audit_logs')
    op.drop_index('ix_sys_audit_logs_target_type', table_name='sys_audit_logs')
    op.drop_index('ix_sys_audit_logs_action', table_name='sys_audit_logs')
    op.drop_index('ix_sys_audit_logs_username', table_name='sys_audit_logs')
    op.drop_index('ix_sys_audit_logs_user_id', table_name='sys_audit_logs')
    op.drop_index('ix_sys_audit_logs_id', table_name='sys_audit_logs')
    op.drop_table('sys_audit_logs')
