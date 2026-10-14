from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import (
    current_user,
    ensure_can_manage_class,
    get_class_or_404,
    require_roles,
    visible_student_ids,
)
from app.models import Classroom, Enrollment, Role, User
from app.schemas import ClassCreate, ClassOut, ClassUpdate, EnrollIn, UserOut

router = APIRouter(prefix="/classes", tags=["classes"])
admin_only = require_roles(Role.admin)


def _check_teacher(db: Session, teacher_id: int | None) -> None:
    if teacher_id is None:
        return
    teacher = db.get(User, teacher_id)
    if not teacher or teacher.role != Role.teacher:
        raise HTTPException(400, "teacher_id phải là một giáo viên hợp lệ.")


@router.get("", response_model=list[ClassOut])
def list_classes(db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = select(Classroom).order_by(Classroom.code)
    if user.role == Role.teacher:
        query = query.where(Classroom.teacher_id == user.id)
    elif user.role in (Role.student, Role.parent):
        ids = visible_student_ids(db, user) or set()
        enrolled = select(Enrollment.class_id).where(Enrollment.student_id.in_(list(ids)))
        query = query.where(Classroom.id.in_(enrolled))
    return db.scalars(query).all()


@router.post("", response_model=ClassOut, status_code=201)
def create_class(data: ClassCreate, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    if db.scalar(select(Classroom.id).where(Classroom.code == data.code)):
        raise HTTPException(409, "Mã lớp đã tồn tại.")
    _check_teacher(db, data.teacher_id)
    classroom = Classroom(**data.model_dump())
    db.add(classroom)
    db.commit()
    return classroom


@router.get("/{class_id}", response_model=ClassOut)
def get_class(class_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    classroom = get_class_or_404(db, class_id)
    if user.role == Role.admin:
        return classroom
    if user.role == Role.teacher:
        ensure_can_manage_class(user, classroom)
        return classroom
    ids = visible_student_ids(db, user) or set()
    enrolled = db.scalar(
        select(Enrollment.id).where(
            Enrollment.class_id == class_id, Enrollment.student_id.in_(list(ids))
        )
    )
    if not enrolled:
        raise HTTPException(403, "Bạn không thuộc lớp này.")
    return classroom


@router.patch("/{class_id}", response_model=ClassOut)
def update_class(
    class_id: int,
    data: ClassUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    classroom = get_class_or_404(db, class_id)
    changes = data.model_dump(exclude_unset=True)
    if "teacher_id" in changes:
        _check_teacher(db, changes["teacher_id"])
    for field, value in changes.items():
        setattr(classroom, field, value)
    db.commit()
    return classroom


@router.get("/{class_id}/students", response_model=list[UserOut])
def list_class_students(
    class_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.admin, Role.teacher)),
):
    classroom = get_class_or_404(db, class_id)
    ensure_can_manage_class(user, classroom)
    ids = select(Enrollment.student_id).where(Enrollment.class_id == class_id)
    return db.scalars(select(User).where(User.id.in_(ids)).order_by(User.full_name)).all()


@router.post("/{class_id}/students", status_code=201)
def enroll_student(
    class_id: int,
    data: EnrollIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.admin, Role.teacher)),
):
    classroom = get_class_or_404(db, class_id)
    ensure_can_manage_class(user, classroom)
    student = db.get(User, data.student_id)
    if not student or student.role != Role.student:
        raise HTTPException(404, "Không tìm thấy học viên.")
    exists = db.scalar(
        select(Enrollment.id).where(
            Enrollment.class_id == class_id, Enrollment.student_id == data.student_id
        )
    )
    if exists:
        raise HTTPException(409, "Học viên đã có trong lớp.")
    db.add(Enrollment(class_id=class_id, student_id=data.student_id))
    db.commit()
    return {"class_id": class_id, "student_id": data.student_id}


@router.delete("/{class_id}/students/{student_id}", status_code=204)
def remove_student(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.admin, Role.teacher)),
):
    classroom = get_class_or_404(db, class_id)
    ensure_can_manage_class(user, classroom)
    enrollment = db.scalar(
        select(Enrollment).where(Enrollment.class_id == class_id, Enrollment.student_id == student_id)
    )
    if not enrollment:
        raise HTTPException(404, "Học viên không có trong lớp.")
    db.delete(enrollment)
    db.commit()
