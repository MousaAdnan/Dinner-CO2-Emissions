from fastapi import APIRouter, HTTPException, Query

from models.impact import ImpactSummary
from services.impact_service import calculate_impact

router = APIRouter(prefix="/impact", tags=["impact"])

@router.get("/summary", response_model=ImpactSummary)
def get_summary(session_id: str = Query(..., description="Unique session ID")):
    #Calculate the CO2 impact summary
    summary = calculate_impact(session_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary
