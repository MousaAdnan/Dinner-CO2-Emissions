from typing import List
from pydantic import BaseModel

class PlateItem(BaseModel):
    ingredient_id: int
    quantity_g: int

class Plate(BaseModel):
    session_id: str
    items: List[PlateItem]

