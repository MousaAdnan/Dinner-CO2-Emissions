from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List
import os
import json
import requests

from models.impact import ImpactSummary
from services.impact_service import calculate_impact

router = APIRouter(prefix="/impact", tags=["impact"])

# --------------------------
#  Existing summary endpoint
# --------------------------
@router.get("/summary", response_model=ImpactSummary)
def get_summary(
    session_id: str = Query(..., description="Unique session ID")
):
    try:
        return calculate_impact(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================
#  NEW: Gemini-powered impact explanation API
# ============================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-1.5-flash"

class ImpactExplanation(BaseModel):
    session_id: str
    headline: str
    bullets: List[str]
    call_to_action: str


def build_gemini_prompt(summary: ImpactSummary) -> str:
    """
    Builds a clean prompt to send to Gemini using your actual ImpactSummary fields.
    """
    return f"""
You are explaining the environmental impact of a single meal.

Plate Summary:
- Impact score: {summary.impact_score_1_to_10:.1f} / 10
- Total CO₂ emissions: {summary.total_co2_kg:.2f} kg
- Freshwater use: {summary.total_freshwater_l:.1f} liters
- Land use: {summary.total_land_m2:.2f} m²

TASK:
1. Provide ONE short headline (~80 characters max).
2. Provide 3–4 bullet points explaining the environmental meaning.
3. Provide ONE short constructive call to action.

Return ONLY valid JSON in this format:

{{
  "headline": "string",
  "bullets": ["string", "string", "string"],
  "call_to_action": "string"
}}
"""


@router.post("/explain", response_model=ImpactExplanation)
def explain_impact(
    session_id: str = Query(..., description="Unique session ID")
):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the server."
        )

    # 1️⃣ Get the summary using your existing service
    try:
        summary = calculate_impact(session_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")

    # 2️⃣ Build the Gemini prompt
    prompt = build_gemini_prompt(summary)

    # 3️⃣ Call Gemini API
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

    try:
        resp = requests.post(
            url,
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [
                    {"parts": [{"text": prompt}]}
                ]
            },
            timeout=20
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error calling Gemini: {str(e)}")

    # 4️⃣ Extract text response
    try:
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        raise HTTPException(status_code=502, detail="Unexpected response format from Gemini")

    # 5️⃣ Parse text as JSON
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini did not return valid JSON")

    # 6️⃣ Return structured result
    return ImpactExplanation(
        session_id=session_id,
        headline=parsed.get("headline", "Your meal has environmental impact."),
        bullets=parsed.get("bullets", []),
        call_to_action=parsed.get(
            "call_to_action",
            "Try replacing one high-impact ingredient with a lower-impact alternative."
        ),
    )
