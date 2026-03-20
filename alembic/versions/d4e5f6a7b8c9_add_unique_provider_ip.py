"""add_unique_provider_ip

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-20 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_resource_provider_ip',
        'cmdb_resources',
        ['provider', 'ip_address']
    )


def downgrade() -> None:
    op.drop_constraint('uq_resource_provider_ip', 'cmdb_resources', type_='unique')
