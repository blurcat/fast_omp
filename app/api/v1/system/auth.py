from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.system import User
from app.schemas.system import Token
from app.core.audit import create_audit_log

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 兼容的 Token 登录接口
    获取 Access Token 用于后续请求认证
    """
    # 根据用户名查询用户
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    
    # 验证用户是否存在及密码是否正确
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 验证用户是否激活
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="用户未激活")
        
    # 生成 Access Token
    access_token = create_access_token(subject=user.username)

    # 记录登录日志
    await create_audit_log(
        db,
        user_id=user.id,
        username=user.username,
        action="login",
        target_type="auth",
        target_id=str(user.id),
        details={"status": "success"},
        ip_address=request.client.host if request.client else None
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
