from pydantic import BaseModel
from typing import Optional


class Ingredient(BaseModel):
    id: int
    slug: str
    name: str
    category: str
    co2_kg_per_kg: float
    land_m2_per_kg: Optional[float] = None
    freshwater_l_per_kg: Optional[float] = None
    scarcity_water_l_per_kg: Optional[float] = None
    default_portion_g: int
