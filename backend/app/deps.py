"""Xác thực + phân quyền. Thay cho database.rules.json của Firebase."""
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Classroom, Enrollment, ParentStudent, Role, User
from app.security import decode_access_token

_bearer = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Chưa đăng nhập hoặc phiên đã hết hạn.") -> HTTPException:
    return HTTPException(401, detail, headers={"WWW-Authenticate": "Bearer"})


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise _unauthorized()
    try:
        payload = decode_access_token(creds.credentials)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _unauthorized()
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized()
    return user


def require_roles(*roles: Role):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Không đủ quyền thực hiện thao tác này.")
        return user

    return dependency


# ---------- Phạm vi dữ liệu theo vai trò ----------
def visible_student_ids(db: Session, user: User) -> set[int] | None:
    """None = thấy tất cả (admin). Ngược lại là tập id học viên được phép xem."""
    if user.role == Role.admin:
        return None
    if user.role == Role.student:
        return {user.id}
    if user.role == Role.parent:
        rows = db.scalars(select(ParentStudent.student_id).where(ParentStudent.parent_id == user.id))
        return set(rows)
    own_classes = select(Classroom.id).where(Classroom.teacher_id == user.id)
    rows = db.scalars(select(Enrollment.student_id).where(Enrollment.class_id.in_(own_classes)))
    return set(rows)


def ensure_can_view_student(db: Session, user: User, student_id: int) -> None:
    ids = visible_student_ids(db, user)
    if ids is not None and student_id not in ids:
        raise HTTPException(403, "Bạn không có quyền xem dữ liệu của học viên này.")


def get_class_or_404(db: Session, class_id: int) -> Classroom:
    classroom = db.get(Classroom, class_id)
    if classroom is None:
        raise HTTPException(404, "Không tìm thấy lớp học.")
    return classroom


def ensure_can_manage_class(user: User, classroom: Classroom) -> None:
    if user.role == Role.admin:
        return
    if user.role == Role.teacher and classroom.teacher_id == user.id:
        return
    raise HTTPException(403, "Bạn không phụ trách lớp này.")


def scope_class_student_query(db: Session, user: User, query, model):
    """Giới hạn truy vấn của bảng có cột class_id + student_id theo vai trò."""
    if user.role == Role.admin:
        return query
    if user.role == Role.teacher:
        own = select(Classroom.id).where(Classroom.teacher_id == user.id)
        return query.where(model.class_id.in_(own))
    ids = visible_student_ids(db, user) or set()
    return query.where(model.student_id.in_(list(ids)))
