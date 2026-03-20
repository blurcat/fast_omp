"""fix_audit_logs_timestamps

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-20 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 补填已有 NULL 记录
    op.execute("UPDATE sys_audit_logs SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE sys_audit_logs SET updated_at = NOW() WHERE updated_at IS NULL")
    # 修改列：加 server_default 并改为非空
    op.alter_column('sys_audit_logs', 'created_at',
                    existing_type=sa.DateTime(),
                    server_default=sa.text('NOW()'),
                    nullable=False)
    op.alter_column('sys_audit_logs', 'updated_at',
                    existing_type=sa.DateTime(),
                    server_default=sa.text('NOW()'),
                    nullable=False)


def downgrade() -> None:
    op.alter_column('sys_audit_logs', 'created_at',
                    existing_type=sa.DateTime(),
                    server_default=None,
                    nullable=True)
    op.alter_column('sys_audit_logs', 'updated_at',
                    existing_type=sa.DateTime(),
                    server_default=None,
                    nullable=True)
