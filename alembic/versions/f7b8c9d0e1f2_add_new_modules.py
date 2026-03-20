"""add_new_modules: monitor, jobs, changes, credentials, inspections

Revision ID: f7b8c9d0e1f2
Revises: e5f6a7b8c9d0
Create Date: 2026-03-20 14:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f7b8c9d0e1f2'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # monitor_alert_channels
    op.create_table(
        'monitor_alert_channels',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('config', sa.JSON(), server_default='{}'),
        sa.Column('enabled', sa.Boolean(), server_default='true'),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # monitor_alert_rules
    op.create_table(
        'monitor_alert_rules',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('resource_id', sa.Integer(), sa.ForeignKey('cmdb_resources.id'), nullable=True),
        sa.Column('group_id', sa.Integer(), sa.ForeignKey('cmdb_resource_groups.id'), nullable=True),
        sa.Column('metric', sa.String(100), nullable=False),
        sa.Column('operator', sa.String(10), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), server_default='5'),
        sa.Column('severity', sa.String(20), server_default='warning'),
        sa.Column('enabled', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # monitor_rule_channels (many-to-many)
    op.create_table(
        'monitor_rule_channels',
        sa.Column('rule_id', sa.Integer(), sa.ForeignKey('monitor_alert_rules.id'), primary_key=True),
        sa.Column('channel_id', sa.Integer(), sa.ForeignKey('monitor_alert_channels.id'), primary_key=True),
    )

    # monitor_alert_events
    op.create_table(
        'monitor_alert_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('rule_id', sa.Integer(), sa.ForeignKey('monitor_alert_rules.id'), nullable=True),
        sa.Column('resource_id', sa.Integer(), sa.ForeignKey('cmdb_resources.id'), nullable=True),
        sa.Column('resource_name', sa.String(200), nullable=True),
        sa.Column('metric', sa.String(100), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('severity', sa.String(20), server_default='warning'),
        sa.Column('status', sa.String(20), server_default='firing'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acknowledged_by', sa.String(100), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # monitor_metrics
    op.create_table(
        'monitor_metrics',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('resource_id', sa.Integer(), sa.ForeignKey('cmdb_resources.id'), nullable=False, index=True),
        sa.Column('resource_name', sa.String(200), nullable=True),
        sa.Column('metric', sa.String(100), nullable=False, index=True),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(20), nullable=True),
        sa.Column('collected_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False, index=True),
    )

    # job_templates
    op.create_table(
        'job_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(200), nullable=False, index=True),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('script', sa.Text(), nullable=False),
        sa.Column('timeout', sa.Integer(), server_default='300'),
        sa.Column('parameters', sa.JSON(), server_default='{}'),
        sa.Column('tags', sa.JSON(), server_default='[]'),
        sa.Column('created_by', sa.String(100), nullable=True),
        sa.Column('enabled', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # job_executions
    op.create_table(
        'job_executions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('job_templates.id'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('script', sa.Text(), nullable=False),
        sa.Column('targets', sa.JSON(), server_default='[]'),
        sa.Column('parameters', sa.JSON(), server_default='{}'),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.String(100), nullable=True),
        sa.Column('summary', sa.JSON(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # job_execution_logs
    op.create_table(
        'job_execution_logs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('execution_id', sa.Integer(), sa.ForeignKey('job_executions.id'), nullable=False, index=True),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('host', sa.String(100), nullable=True),
        sa.Column('stdout', sa.Text(), nullable=True),
        sa.Column('stderr', sa.Text(), nullable=True),
        sa.Column('exit_code', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    )

    # change_requests
    op.create_table(
        'change_requests',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(20), server_default='normal'),
        sa.Column('risk_level', sa.String(20), server_default='medium'),
        sa.Column('resource_ids', sa.JSON(), server_default='[]'),
        sa.Column('plan', sa.Text(), nullable=True),
        sa.Column('rollback_plan', sa.Text(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20), server_default='draft', index=True),
        sa.Column('created_by', sa.String(100), nullable=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('sys_users.id'), nullable=True),
        sa.Column('approver_id', sa.Integer(), sa.ForeignKey('sys_users.id'), nullable=True),
        sa.Column('approver_name', sa.String(100), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # credentials
    op.create_table(
        'credentials',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(200), nullable=False, unique=True),
        sa.Column('type', sa.String(30), nullable=False),
        sa.Column('username', sa.String(100), nullable=True),
        sa.Column('encrypted_data', sa.Text(), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('resource_ids', sa.JSON(), server_default='[]'),
        sa.Column('created_by', sa.String(100), nullable=True),
        sa.Column('enabled', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # inspection_templates
    op.create_table(
        'inspection_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('script', sa.Text(), nullable=True),
        sa.Column('items', sa.JSON(), server_default='[]'),
        sa.Column('schedule', sa.String(100), nullable=True),
        sa.Column('enabled', sa.Boolean(), server_default='true'),
        sa.Column('created_by', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # inspection_tasks
    op.create_table(
        'inspection_tasks',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('inspection_templates.id'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('targets', sa.JSON(), server_default='[]'),
        sa.Column('status', sa.String(20), server_default='pending', index=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('report', sa.JSON(), server_default='{}'),
        sa.Column('created_by', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('inspection_tasks')
    op.drop_table('inspection_templates')
    op.drop_table('credentials')
    op.drop_table('change_requests')
    op.drop_table('job_execution_logs')
    op.drop_table('job_executions')
    op.drop_table('job_templates')
    op.drop_table('monitor_metrics')
    op.drop_table('monitor_alert_events')
    op.drop_table('monitor_rule_channels')
    op.drop_table('monitor_alert_rules')
    op.drop_table('monitor_alert_channels')
