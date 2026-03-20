"""监控服务 - 告警规则评估"""
import operator as op
from datetime import datetime, timezone, timedelta
from typing import List
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.monitor import AlertRule, AlertEvent, MetricRecord, AlertStatus, AlertSeverity
from app.services.notification_service import notify_alert

OPERATORS = {
    ">": op.gt,
    "<": op.lt,
    ">=": op.ge,
    "<=": op.le,
    "==": op.eq,
}


async def evaluate_rules(db: AsyncSession) -> int:
    """
    评估所有启用的告警规则，触发或恢复告警事件。
    返回触发的新告警数量。
    """
    fired_count = 0
    now = datetime.now(timezone.utc)

    # Load all enabled rules with channels
    stmt = select(AlertRule).where(AlertRule.enabled == True).options(
        selectinload(AlertRule.channels)
    )
    result = await db.execute(stmt)
    rules = result.scalars().all()

    for rule in rules:
        compare = OPERATORS.get(rule.operator)
        if not compare:
            continue

        # Get target resource_ids for this rule
        resource_ids = []
        if rule.resource_id:
            resource_ids = [rule.resource_id]
        elif rule.group_id:
            # Get all resources in the group
            from app.models.cmdb import resource_groups_association
            from sqlalchemy import select as sel
            res = await db.execute(
                sel(resource_groups_association.c.resource_id).where(
                    resource_groups_association.c.group_id == rule.group_id
                )
            )
            resource_ids = [r[0] for r in res.fetchall()]

        if not resource_ids:
            continue

        # Check latest metric within duration window
        since = now - timedelta(minutes=rule.duration_minutes)
        for rid in resource_ids:
            metric_stmt = (
                select(MetricRecord)
                .where(
                    MetricRecord.resource_id == rid,
                    MetricRecord.metric == rule.metric,
                    MetricRecord.collected_at >= since,
                )
                .order_by(MetricRecord.collected_at.desc())
                .limit(1)
            )
            metric_result = await db.execute(metric_stmt)
            record = metric_result.scalars().first()

            if record is None:
                continue

            is_violated = compare(record.value, rule.threshold)

            # Check existing firing event
            event_stmt = select(AlertEvent).where(
                AlertEvent.rule_id == rule.id,
                AlertEvent.resource_id == rid,
                AlertEvent.status == AlertStatus.FIRING,
            )
            event_result = await db.execute(event_stmt)
            existing_event = event_result.scalars().first()

            if is_violated and not existing_event:
                # Fire new alert
                event = AlertEvent(
                    rule_id=rule.id,
                    resource_id=rid,
                    resource_name=record.resource_name,
                    metric=rule.metric,
                    value=record.value,
                    threshold=rule.threshold,
                    severity=rule.severity,
                    status=AlertStatus.FIRING,
                    started_at=now,
                )
                db.add(event)
                await db.flush()
                fired_count += 1

                # Send notifications
                for channel in rule.channels:
                    if not channel.enabled:
                        continue
                    title = f"[{rule.severity.upper()}] {rule.name} 告警"
                    body = (
                        f"**资源**: {record.resource_name or rid}\n"
                        f"**指标**: {rule.metric} = {record.value}\n"
                        f"**阈值**: {rule.operator} {rule.threshold}\n"
                        f"**时间**: {now.strftime('%Y-%m-%d %H:%M:%S')}"
                    )
                    try:
                        await notify_alert(channel.config, channel.type, title, body)
                    except Exception as e:
                        logger.error(f"Notify failed: {e}")

            elif not is_violated and existing_event:
                # Resolve existing alert
                existing_event.status = AlertStatus.RESOLVED
                existing_event.resolved_at = now
                db.add(existing_event)

    await db.commit()
    return fired_count
