from pydantic import BaseModel
from typing import List


class IngredientImpact(BaseModel):
    ingredient_id: int
    name: str
    quantity_g: int
    co2_kg: float
    freshwater_l: float
    land_m2: float


class ImpactSummary(BaseModel):
    session_id: str
    total_co2_kg: float
    total_freshwater_l: float
    total_land_m2: float
    impact_score_1_to_10: float
    items: List[IngredientImpact]
