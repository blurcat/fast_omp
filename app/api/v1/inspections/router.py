from typing import Any, List, Optional, Literal
from datetime import datetime, timezone
import base64
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.inspections import InspectionTemplate, InspectionTask, InspectionStatus
from app.models.cmdb import Resource
from app.models.credentials import Credential
from app.schemas.inspections import (
    InspectionTemplateCreate, InspectionTemplateResponse, InspectionTemplateUpdate,
    InspectionTaskCreate, InspectionTaskResponse,
)
from app.schemas.system import MessageResponse
from app.services.job_service import execute_ssh_command

router = APIRouter()


# --- Templates ---

@router.get("/templates", response_model=List[InspectionTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    skip: int = 0, limit: int = 100,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """获取巡检模板列表"""
    result = await db.execute(select(InspectionTemplate).order_by(InspectionTemplate.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/templates", response_model=InspectionTemplateResponse)
async def create_template(
    *, db: AsyncSession = Depends(get_db),
    tmpl_in: InspectionTemplateCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """创建巡检模板，`script` 字段为 Shell 脚本内容"""
    tmpl = InspectionTemplate(**tmpl_in.model_dump(), created_by=current_user.username)
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.put("/templates/{tmpl_id}", response_model=InspectionTemplateResponse, responses={404: {"description": "不存在"}})
async def update_template(
    *, db: AsyncSession = Depends(get_db),
    tmpl_id: int,
    tmpl_in: InspectionTemplateUpdate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """更新巡检模板"""
    result = await db.execute(select(InspectionTemplate).where(InspectionTemplate.id == tmpl_id))
    tmpl = result.scalars().first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    for k, v in tmpl_in.model_dump(exclude_unset=True).items():
        setattr(tmpl, k, v)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{tmpl_id}", response_model=MessageResponse, responses={404: {"description": "不存在"}})
async def delete_template(
    *, db: AsyncSession = Depends(get_db),
    tmpl_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """删除巡检模板"""
    result = await db.execute(select(InspectionTemplate).where(InspectionTemplate.id == tmpl_id))
    tmpl = result.scalars().first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(tmpl)
    await db.commit()
    return {"message": "Deleted"}


# --- Tasks ---

@router.get("/tasks", response_model=List[InspectionTaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    status: Optional[Literal["pending", "running", "completed", "failed"]] = None,
    skip: int = 0, limit: int = 50,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """获取巡检任务列表，支持按状态过滤"""
    stmt = select(InspectionTask)
    if status:
        stmt = stmt.where(InspectionTask.status == status)
    stmt = stmt.order_by(InspectionTask.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/tasks", response_model=InspectionTaskResponse)
async def create_task(
    *, db: AsyncSession = Depends(get_db),
    task_in: InspectionTaskCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """创建巡检任务，`targets` 为目标资产 ID 列表"""
    task = InspectionTask(**task_in.model_dump(), created_by=current_user.username)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.post("/tasks/{task_id}/run", response_model=InspectionTaskResponse, responses={404: {"description": "不存在"}, 400: {"description": "参数错误"}})
async def run_task(
    *, db: AsyncSession = Depends(get_db),
    task_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """
    执行巡检任务

    - 从关联模板读取巡检脚本
    - 对 targets 中的每台资产通过 SSH 执行脚本（使用资产绑定的凭证）
    - 结果存储在 `report.hosts` 中，每条含 name/ip/success/stdout/stderr
    """
    result = await db.execute(select(InspectionTask).where(InspectionTask.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == InspectionStatus.RUNNING:
        raise HTTPException(status_code=400, detail="任务正在执行中")

    # 加载模板获取脚本
    if not task.template_id:
        raise HTTPException(status_code=400, detail="未关联巡检模板")
    tmpl_result = await db.execute(select(InspectionTemplate).where(InspectionTemplate.id == task.template_id))
    template = tmpl_result.scalars().first()
    if not template or not template.script:
        raise HTTPException(status_code=400, detail="模板未配置巡检脚本")

    # 标记为执行中
    task.status = InspectionStatus.RUNNING
    task.started_at = datetime.now(timezone.utc)
    await db.commit()

    host_results = []
    for resource_id in (task.targets or []):
        res_r = await db.execute(select(Resource).where(Resource.id == resource_id))
        resource = res_r.scalars().first()
        if not resource:
            host_results.append({"resource_id": resource_id, "name": f"ID:{resource_id}", "ip": None, "success": False, "stdout": "", "stderr": "资产不存在"})
            continue
        if not resource.ip_address:
            host_results.append({"resource_id": resource_id, "name": resource.name, "ip": None, "success": False, "stdout": "", "stderr": "未配置 IP 地址"})
            continue
        if not resource.credential_id:
            host_results.append({"resource_id": resource_id, "name": resource.name, "ip": resource.ip_address, "success": False, "stdout": "", "stderr": "未绑定 SSH 凭证"})
            continue

        cred_r = await db.execute(select(Credential).where(Credential.id == resource.credential_id))
        credential = cred_r.scalars().first()
        if not credential or not credential.enabled:
            host_results.append({"resource_id": resource_id, "name": resource.name, "ip": resource.ip_address, "success": False, "stdout": "", "stderr": "凭证不存在或已禁用"})
            continue

        secret = base64.b64decode(credential.encrypted_data.encode()).decode()
        port = int(resource.data.get("port", 22)) if resource.data else 22

        ssh_result = await execute_ssh_command(
            host=resource.ip_address,
            port=port,
            username=credential.username or "root",
            password=secret if credential.type == "ssh_password" else None,
            private_key=secret if credential.type == "ssh_key" else None,
            command=template.script,
            timeout=60,
        )
        host_results.append({
            "resource_id": resource_id,
            "name": resource.name,
            "ip": resource.ip_address,
            "success": ssh_result["success"],
            "stdout": ssh_result.get("stdout", "").strip(),
            "stderr": ssh_result.get("stderr", "").strip(),
        })

    success_count = sum(1 for r in host_results if r["success"])
    task.status = InspectionStatus.COMPLETED if success_count == len(host_results) else InspectionStatus.FAILED
    task.finished_at = datetime.now(timezone.utc)
    task.report = {
        "hosts": host_results,
        "total": len(host_results),
        "success_count": success_count,
        "template_name": template.name,
    }
    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", response_model=MessageResponse, responses={404: {"description": "不存在"}})
async def delete_task(
    *, db: AsyncSession = Depends(get_db),
    task_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """删除巡检任务及其执行结果"""
    result = await db.execute(select(InspectionTask).where(InspectionTask.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"message": "Deleted"}
