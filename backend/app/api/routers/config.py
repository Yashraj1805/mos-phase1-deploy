from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.config_schema import BusinessConfigCreate, BusinessConfigResponse
from app.services.config.config_service import ConfigService

router = APIRouter(prefix="/config", tags=["Config"])


@router.post("/create")
def create_config(payload: BusinessConfigCreate, db: Session = Depends(get_db)):
    return ConfigService.create_config(payload, db)


@router.get("/{tenant_id}", response_model=BusinessConfigResponse)
def get_config(tenant_id: str, db: Session = Depends(get_db)):
    return ConfigService.get_config(tenant_id, db)
