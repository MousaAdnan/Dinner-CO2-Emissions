from pydantic import BaseModel
from typing import List, Optional

class IngredientImpact(BaseModel):
    ingredient_id: int
    name: str
    quantity_g: int
    co2_kg: float
    freshwater_l: Optional[float] = None
    scarcity_water_l: Optional[float] = None

class ImpactSummary(BaseModel):
    session_id: str
    total_co2_kg: float
    total_freshwater_l: float
    total_scarcity_water_l: float
    water_score: int
    impact_messages: List[str]
    items: List[IngredientImpact]
