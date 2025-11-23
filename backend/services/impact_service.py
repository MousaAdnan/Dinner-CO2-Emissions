from typing import List

from models.impact import ImpactSummary, IngredientImpact
from services.plate_service import get_plate
from services.ingredient_service import get_ingredient_by_id

def _compute_impact_score(total_co2: float, total_water: float, total_land: float) -> float:
    """
    Returns a score from 1 (best) to 10 (worst).
    Higher CO₂ / water / land => higher score.

    We normalize each metric between the best and worst possible plates:
      - CO₂:   0.26 kg (best)  to 15.76 kg (worst)
      - Water: 184.6 L (best)  to 1926.1 L (worst)
      - Land:  0.42 m² (best)  to 71.18 m² (worst)

    Then combine with weights:
      60% CO₂, 30% water, 10% land.
    """

    # Best (100% good) plate
    min_co2 = 0.26       # kg
    min_water = 184.6    # liters
    min_land = 0.42      # m²

    # Worst (100% bad) plate
    max_co2 = 15.76      # kg
    max_water = 1926.1   # liters
    max_land = 71.18     # m²

    # Avoid division by zero (shouldn't happen with your values, but just in case)
    co2_range = max_co2 - min_co2 or 1.0
    water_range = max_water - min_water or 1.0
    land_range = max_land - min_land or 1.0

    # Normalize each metric to [0, 1] based on min/max
    co2_norm = (total_co2 - min_co2) / co2_range
    water_norm = (total_water - min_water) / water_range
    land_norm = (total_land - min_land) / land_range

    # Clamp to [0, 1]
    co2_norm = min(max(co2_norm, 0.0), 1.0)
    water_norm = min(max(water_norm, 0.0), 1.0)
    land_norm = min(max(land_norm, 0.0), 1.0)

    # Weighted combined impact: 0 = best, 1 = worst
    combined = 0.6 * co2_norm + 0.3 * water_norm + 0.1 * land_norm

    # Map combined to score:
    #   combined = 0 -> score = 1 (best)
    #   combined = 1 -> score = 10 (worst)
    score = 1.0 + combined * 9.0

    # Clamp and round
    return round(min(10.0, max(1.0, score)), 1)

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
