"""add_credential_id_to_resources

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-03-23 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'cmdb_resources',
        sa.Column('credential_id', sa.Integer(), sa.ForeignKey('credentials.id', ondelete='SET NULL'), nullable=True, comment='关联凭证ID')
    )
    op.create_index('ix_cmdb_resources_credential_id', 'cmdb_resources', ['credential_id'])


def downgrade() -> None:
    op.drop_index('ix_cmdb_resources_credential_id', 'cmdb_resources')
    op.drop_column('cmdb_resources', 'credential_id')
