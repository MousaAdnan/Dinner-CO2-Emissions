from pydantic import BaseModel

class Ingredient(BaseModel):
    id: int
    name: str
    category: str
    co2_kg_per_kg: float
    default_portion_g: int

