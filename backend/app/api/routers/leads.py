from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.lead_schema import LeadCreate
from app.services.leads.lead_service import LeadService

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.post("/create")
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    return LeadService.create_lead(payload, db)
