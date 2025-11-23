from fastapi import APIRouter, HTTPException, Query
from models.impact import ImpactSummary
from services.impact_service import calculate_impact

router = APIRouter(prefix="/impact", tags=["impact"])


@router.get("/summary", response_model=ImpactSummary)
def get_summary(
    session_id: str = Query(..., description="Unique session ID")
):
    try:
        return calculate_impact(session_id)
    except ValueError as e:
        # Session not found or similar logical problem
        raise HTTPException(status_code=404, detail=str(e))
