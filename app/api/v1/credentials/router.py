from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.database import get_db
from app.models.credentials import Credential
from app.schemas.credentials import CredentialCreate, CredentialResponse, CredentialUpdate

router = APIRouter()

# Simple encryption using base64 (production should use Fernet/KMS)
import base64


def encrypt_secret(secret: str) -> str:
    return base64.b64encode(secret.encode()).decode()


def decrypt_secret(encrypted: str) -> str:
    return base64.b64decode(encrypted.encode()).decode()


@router.get("/", response_model=List[CredentialResponse])
async def list_credentials(
    db: AsyncSession = Depends(get_db),
    skip: int = 0, limit: int = 100,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(Credential).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=CredentialResponse)
async def create_credential(
    *, db: AsyncSession = Depends(get_db),
    cred_in: CredentialCreate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    # Check duplicate name
    existing = await db.execute(select(Credential).where(Credential.name == cred_in.name))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Credential name already exists")

    data = cred_in.model_dump(exclude={"secret"})
    cred = Credential(
        **data,
        encrypted_data=encrypt_secret(cred_in.secret),
        created_by=current_user.username,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return cred


@router.put("/{cred_id}", response_model=CredentialResponse)
async def update_credential(
    *, db: AsyncSession = Depends(get_db),
    cred_id: int,
    cred_in: CredentialUpdate,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(Credential).where(Credential.id == cred_id))
    cred = result.scalars().first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    for k, v in cred_in.model_dump(exclude={"secret"}, exclude_unset=True).items():
        setattr(cred, k, v)
    if cred_in.secret:
        cred.encrypted_data = encrypt_secret(cred_in.secret)
    await db.commit()
    await db.refresh(cred)
    return cred


@router.delete("/{cred_id}")
async def delete_credential(
    *, db: AsyncSession = Depends(get_db),
    cred_id: int,
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    result = await db.execute(select(Credential).where(Credential.id == cred_id))
    cred = result.scalars().first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    await db.delete(cred)
    await db.commit()
    return {"message": "Deleted"}
