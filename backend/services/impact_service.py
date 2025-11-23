from typing import Optional, List

from models.impact import ImpactSummary, IngredientImpact
from services.plate_service import get_plate
from services.ingredient_service import get_ingredient_by_id

def normalize(value: float, min_v: float, max_v: float) -> float:
    if max_v == min_v:
        return 0.0
    return (value-min_v)/(max_v - min_v)

def compute_score(total_co2: float, total_water: float, total_land: float) -> float:
    CO2_MIN, CO2_MAX = 0, 20
    WATER_MIN, WATER_MAX = 0, 5000
    LAND_MIN, LAND_MAX = 0, 100

    co2_norm = normalize(total_co2, CO2_MIN, CO2_MAX)
    water_norm = normalize(total_water, WATER_MIN, WATER_MAX)
    land_norm = normalize(total_land, LAND_MIN, LAND_MAX)

    weight = (0.60 * co2_norm + 0.30 * water_norm + 0.10 * land_norm)

    score = 10 * (1 - weight)
    return max(1.0, min(10.0, round(score, 1)))

def calculate_impact(session_id: str) -> Optional[ImpactSummary]:
    #Calculate total CO2 impact of all ingredients on this plate
    plate = get_plate(session_id)
    if plate is None:
        return None
    
    item_impacts: List[IngredientImpact] = []
    total_co2 = 0.0
    total_water = 0.0
    total_land = 0.0

    for item in plate.items:
        ingredient = get_ingredient_by_id(item.ingredient_id)
        if ingredient is None:
            continue

        quantity_kg = item.quantity_g / 1000.0

        co2 = quantity_kg * ingredient.co2_kg_per_kg

        water = quantity_kg * ingredient.freshwater_l_per_kg if ingredient.freshwater_l_per_kg else 0.0

        land = quantity_kg * ingredient.land_m2_per_kg if ingredient.land_m2_per_kg else 0.0

        item_impacts.append(IngredientImpact(ingredient_id=ingredient.id), name=ingredient.name, quantity_g=item.quantity_g, co2_kg=round(co2, 4), freshwater_l=round(water, 1), land_m2=round(land, 2))

        total_co2 += co2
        total_water += water
        total_land += land

        score = compute_score(total_co2, total_water, total_land)

        return ImpactSummary(session_id=session_id, total_co2_kg=round(total_co2, 4), total_freshwater_l=round(total_water, 1), total_land_m2=round(total_land, 2), impact_score_1_to_10=score, items=item_impacts)