from typing import Optional, List

from models.impact import ImpactSummary, IngredientImpact
from services.plate_service import get_plate
from services.ingredient_service import get_ingredient_by_id

def calculate_impact(session_id: str) -> Optional[ImpactSummary]:
    #Calculate total CO2 impact of all ingredients on this plate
    plate = get_plate(session_id)
    if plate is None:
        return None
    
    item_impacts: List[IngredientImpact] = []
    total_co2 = 0.0

    for item in plate.items:
        ingredient = get_ingredient_by_id(item.ingredient_id)
        if ingredient is None:
            continue

        quantity_kg = item.quantity_g / 1000.0

        co2 = quantity_kg * ingredient.co2_kg_per_kg

        item_impacts.append(IngredientImpact(ingredient_id=ingredient.id), name=ingredient.name, quantity_g=item.quantity_g, co2_kg=round(co2, 4))

        total_co2 += co2
        return ImpactSummary(session_id=session_id, total_co2_kg=round(total_co2, 4), items=item_impacts)