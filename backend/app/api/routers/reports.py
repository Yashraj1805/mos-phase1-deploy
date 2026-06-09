from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.report_schema import ReportGenerateRequest
from app.services.reports.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate")
def generate_report(payload: ReportGenerateRequest, db: Session = Depends(get_db)):
    return ReportService.generate_report(payload, db)
