from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.scenario_schema import ScenarioAnalyzeRequest
from app.services.scenario.scenario_service import ScenarioService

router = APIRouter(prefix="/scenario", tags=["Scenario"])


@router.post("/analyze")
def analyze_scenario(payload: ScenarioAnalyzeRequest, db: Session = Depends(get_db)):
    return ScenarioService.analyze(payload, db)
