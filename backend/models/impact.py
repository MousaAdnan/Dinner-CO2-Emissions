from pydantic import BaseModel
from typing import List

class IngredientImpact(BaseModel):
    ingredient_id: int
    name: str
    quantity_g: int
    co2_kg: float

class ImpactSummary(BaseModel):
    session_id: str
    total_co2_kg: float
    items: List[IngredientImpact]
