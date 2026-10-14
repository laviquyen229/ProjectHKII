from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user, require_roles, visible_student_ids
from app.models import ParentStudent, Role, User
from app.schemas import ChildLinkIn, UserCreate, UserOut, UserUpdate
from app.security import hash_password

router = APIRouter(tags=["users"])
admin_only = require_roles(Role.admin)


@router.get("/users", response_model=list[UserOut])
def list_users(
    role: Role | None = None,
    q: str | None = Query(default=None, max_length=64),
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    query = select(User).order_by(User.id)
    if role:
        query = query.where(User.role == role)
    if q:
        like = f"%{q.strip()}%"
        query = query.where(User.full_name.ilike(like) | User.username.ilike(like))
    return db.scalars(query).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    if db.scalar(select(User.id).where(User.username == data.username)):
        raise HTTPException(409, "Tên đăng nhập đã tồn tại.")
    user = User(
        username=data.username,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    return user


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Không tìm thấy người dùng.")
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_only),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Không tìm thấy người dùng.")
    if user.id == admin.id and (data.is_active is False or (data.role and data.role != Role.admin)):
        raise HTTPException(400, "Không thể tự khóa hoặc hạ quyền chính mình.")
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password is not None:
        user.password_hash = hash_password(data.password)
        user.failed_attempts = 0
        user.locked_until = None
    db.commit()
    return user


@router.get("/students", response_model=list[UserOut])
def list_visible_students(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Danh sách học viên mà người đang đăng nhập được phép xem."""
    ids = visible_student_ids(db, user)
    query = select(User).where(User.role == Role.student, User.is_active.is_(True)).order_by(User.full_name)
    if ids is not None:
        query = query.where(User.id.in_(list(ids)))
    return db.scalars(query).all()


@router.get("/users/{parent_id}/children", response_model=list[UserOut])
def list_children(parent_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role != Role.admin and user.id != parent_id:
        raise HTTPException(403, "Không đủ quyền.")
    ids = select(ParentStudent.student_id).where(ParentStudent.parent_id == parent_id)
    return db.scalars(select(User).where(User.id.in_(ids)).order_by(User.full_name)).all()


@router.post("/users/{parent_id}/children", status_code=201)
def link_child(
    parent_id: int,
    data: ChildLinkIn,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    parent = db.get(User, parent_id)
    student = db.get(User, data.student_id)
    if not parent or parent.role != Role.parent:
        raise HTTPException(404, "Không tìm thấy phụ huynh.")
    if not student or student.role != Role.student:
        raise HTTPException(404, "Không tìm thấy học viên.")
    if db.get(ParentStudent, (parent_id, data.student_id)):
        raise HTTPException(409, "Đã liên kết trước đó.")
    db.add(ParentStudent(parent_id=parent_id, student_id=data.student_id))
    db.commit()
    return {"parent_id": parent_id, "student_id": data.student_id}
