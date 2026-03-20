from typing import Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.core.database import get_db
from app.models.jobs import JobExecution, JobLog, JobStatus
from app.models.cmdb import Resource
from app.schemas.jobs import JobExecutionCreate, JobExecutionResponse
from app.services.job_service import execute_job_on_hosts
import json

router = APIRouter()


@router.get("/", response_model=List[JobExecutionResponse])
async def list_executions(
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    stmt = select(JobExecution).options(selectinload(JobExecution.logs))
    if status:
        stmt = stmt.where(JobExecution.status == status)
    stmt = stmt.order_by(JobExecution.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=JobExecutionResponse)
async def create_execution(
    *, db: AsyncSession = Depends(get_db),
    exec_in: JobExecutionCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """创建并立即执行作业"""
    execution = JobExecution(
        template_id=exec_in.template_id,
        name=exec_in.name,
        script=exec_in.script,
        targets=exec_in.targets,
        parameters=exec_in.parameters,
        status=JobStatus.PENDING,
        created_by=current_user.username,
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    # Gather host info from resource IDs
    hosts = []
    if exec_in.targets:
        res_result = await db.execute(
            select(Resource).where(Resource.id.in_(exec_in.targets))
        )
        resources = res_result.scalars().all()
        for r in resources:
            hosts.append({
                "resource_id": r.id,
                "host": r.ip_address or "",
                "username": "root",  # TODO: use credential
            })

    # Update status to running
    execution.status = JobStatus.RUNNING
    execution.started_at = datetime.now(timezone.utc)
    await db.commit()

    # Execute
    results = await execute_job_on_hosts(hosts, exec_in.script, timeout=300)

    # Save logs
    success_count = 0
    fail_count = 0
    for r in results:
        log = JobLog(
            execution_id=execution.id,
            resource_id=r.get("resource_id"),
            host=r.get("host"),
            stdout=r.get("stdout"),
            stderr=r.get("stderr"),
            exit_code=r.get("exit_code"),
            status="completed" if r.get("success") else "failed",
            started_at=datetime.now(timezone.utc),
            finished_at=datetime.now(timezone.utc),
        )
        db.add(log)
        if r.get("success"):
            success_count += 1
        else:
            fail_count += 1

    execution.status = JobStatus.COMPLETED if fail_count == 0 else JobStatus.FAILED
    execution.finished_at = datetime.now(timezone.utc)
    execution.summary = {"success": success_count, "failed": fail_count, "total": len(results)}
    await db.commit()

    # Reload with logs
    reload_result = await db.execute(
        select(JobExecution).where(JobExecution.id == execution.id).options(selectinload(JobExecution.logs))
    )
    return reload_result.scalars().first()


@router.get("/{execution_id}", response_model=JobExecutionResponse)
async def get_execution(
    *, db: AsyncSession = Depends(get_db),
    execution_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(
        select(JobExecution).where(JobExecution.id == execution_id).options(selectinload(JobExecution.logs))
    )
    execution = result.scalars().first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution
