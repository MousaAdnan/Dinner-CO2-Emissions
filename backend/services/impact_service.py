from typing import List

from models.impact import ImpactSummary, IngredientImpact
from services.plate_service import get_plate
from services.ingredient_service import get_ingredient_by_id


def _compute_impact_score(total_co2: float, total_water: float, total_land: float) -> float:
    """
    Very simple scoring:
    - We assume some rough "bad" upper bounds and clamp.
    - 60% weight CO2, 30% water, 10% land.
    - Lower impact => higher score (1–10).
    """

    # Rough upper bounds for normalization (tuned for your scale, not physics-accurate)
    co2_max = 20.0      # kg
    water_max = 10000.0 # liters
    land_max = 50.0     # m2

    co2_norm = min(total_co2 / co2_max, 1.0)
    water_norm = min(total_water / water_max, 1.0)
    land_norm = min(total_land / land_max, 1.0)

    combined = 0.6 * co2_norm + 0.3 * water_norm + 0.1 * land_norm

    # 0 impact => score 10, max impact => score 1
    score = 10.0 - combined * 9.0
    return round(max(1.0, min(10.0, score)), 1)


def calculate_impact(session_id: str) -> ImpactSummary:
    plate = get_plate(session_id)
    if plate is None:
        # let the router turn this into a 404
        raise ValueError("Session not found")

    total_co2 = 0.0
    total_water = 0.0
    total_land = 0.0
    item_impacts: List[IngredientImpact] = []

    for item in plate.items:
        ingredient = get_ingredient_by_id(item.ingredient_id)
        if ingredient is None:
            continue

        quantity_kg = item.quantity_g / 1000.0

        co2 = quantity_kg * ingredient.co2_kg_per_kg
        water = quantity_kg * (ingredient.freshwater_l_per_kg or 0.0)
        land = quantity_kg * (ingredient.land_m2_per_kg or 0.0)

        total_co2 += co2
        total_water += water
        total_land += land

        item_impacts.append(
            IngredientImpact(
                ingredient_id=ingredient.id,
                name=ingredient.name,
                quantity_g=item.quantity_g,
                co2_kg=round(co2, 4),
                freshwater_l=round(water, 1),
                land_m2=round(land, 2),
            )
        )

    impact_score = _compute_impact_score(total_co2, total_water, total_land)

    return ImpactSummary(
        session_id=session_id,
        total_co2_kg=round(total_co2, 4),
        total_freshwater_l=round(total_water, 1),
        total_land_m2=round(total_land, 2),
        impact_score_1_to_10=impact_score,
        items=item_impacts,
    )
