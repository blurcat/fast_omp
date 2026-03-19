"""add_fk_user_id_to_resource_permissions

Revision ID: a1b2c3d4e5f6
Revises: 2f2785699e8e
Create Date: 2026-03-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '2f2785699e8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """添加 cmdb_resource_permissions.user_id 到 sys_users.id 的外键约束"""
    op.create_foreign_key(
        'fk_resource_permissions_user_id',
        'cmdb_resource_permissions',
        'sys_users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    """移除外键约束"""
    op.drop_constraint(
        'fk_resource_permissions_user_id',
        'cmdb_resource_permissions',
        type_='foreignkey',
    )
