import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import current_user
from app.models import User, as_utc, utcnow
from app.schemas import ChangePasswordIn, LoginIn, TokenOut, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    now = utcnow()
    user = db.scalar(select(User).where(User.username == data.username.strip()))

    if user and user.locked_until and as_utc(user.locked_until) > now:
        raise HTTPException(423, "Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau.")

    ok = bool(user and user.is_active and verify_password(data.password, user.password_hash))
    if not ok:
        if user:
            user.failed_attempts += 1
            if user.failed_attempts >= settings.max_failed_logins:
                user.locked_until = now + dt.timedelta(minutes=settings.lock_minutes)
                user.failed_attempts = 0
            db.commit()
        # Thông báo gộp chung để không lộ việc tài khoản có tồn tại hay không
        raise HTTPException(401, "Sai tên đăng nhập hoặc mật khẩu.")

    user.failed_attempts = 0
    user.locked_until = None
    db.commit()
    return TokenOut(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.post("/change-password", status_code=204)
def change_password(
    data: ChangePasswordIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(400, "Mật khẩu hiện tại không đúng.")
    user.password_hash = hash_password(data.new_password)
    db.commit()
