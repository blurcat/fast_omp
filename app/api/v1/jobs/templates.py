from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.jobs import JobTemplate
from app.schemas.jobs import JobTemplateCreate, JobTemplateResponse, JobTemplateUpdate

router = APIRouter()


@router.get("/", response_model=List[JobTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    skip: int = 0, limit: int = 100,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(JobTemplate).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=JobTemplateResponse)
async def create_template(
    *, db: AsyncSession = Depends(get_db),
    template_in: JobTemplateCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    template = JobTemplate(**template_in.model_dump(), created_by=current_user.username)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.get("/{template_id}", response_model=JobTemplateResponse)
async def get_template(
    *, db: AsyncSession = Depends(get_db),
    template_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(JobTemplate).where(JobTemplate.id == template_id))
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=JobTemplateResponse)
async def update_template(
    *, db: AsyncSession = Depends(get_db),
    template_id: int,
    template_in: JobTemplateUpdate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(JobTemplate).where(JobTemplate.id == template_id))
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for k, v in template_in.model_dump(exclude_unset=True).items():
        setattr(template, k, v)
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}")
async def delete_template(
    *, db: AsyncSession = Depends(get_db),
    template_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(JobTemplate).where(JobTemplate.id == template_id))
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()
    return {"message": "Deleted"}
