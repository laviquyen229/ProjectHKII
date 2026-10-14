from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import ensure_can_manage_class, get_class_or_404, require_roles
from app.models import Role, User
from app.services import report

router = APIRouter(prefix="/reports", tags=["reports"])

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/class/{class_id}/summary")
def class_summary(
    class_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.admin, Role.teacher)),
):
    classroom = get_class_or_404(db, class_id)
    ensure_can_manage_class(user, classroom)
    return report.class_summary_payload(db, classroom)


@router.get("/class/{class_id}/export.xlsx")
def class_export(
    class_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.admin, Role.teacher)),
):
    classroom = get_class_or_404(db, class_id)
    ensure_can_manage_class(user, classroom)
    content = report.class_summary_xlsx(db, classroom)
    filename = f"bao-cao-lop-{classroom.code}.xlsx".replace(" ", "_")
    return Response(
        content,
        media_type=XLSX,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/tuition/export.xlsx")
def tuition_export(db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    return Response(
        report.tuition_xlsx(db),
        media_type=XLSX,
        headers={"Content-Disposition": 'attachment; filename="bao-cao-hoc-phi.xlsx"'},
    )
