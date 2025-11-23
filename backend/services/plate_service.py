from typing import Dict, Optional
from uuid import uuid4

from models.plate import Plate, PlateItem
from services.ingredient_service import get_ingredient_by_id


# In-memory store: session_id -> Plate
_PLATES: Dict[str, Plate] = {}


def start_session() -> Plate:
    """
    Create a new plate/session and return the Plate object.
    """
    session_id = uuid4().hex  # random unique string
    plate = Plate(session_id=session_id, items=[])
    _PLATES[session_id] = plate
    return plate


def get_plate(session_id: str) -> Optional[Plate]:
    """
    Get the plate for a given session_id.
    Returns None if the session does not exist.
    """
    return _PLATES.get(session_id)


def add_to_plate(session_id: str, ingredient_id: int, quantity_g: int) -> Plate:
    """
    Add or update an ingredient on the plate for this session.
    If the ingredient is already on the plate, we increase its quantity.
    """

    # Make sure the ingredient exists
    ingredient = get_ingredient_by_id(ingredient_id)
    if ingredient is None:
        raise ValueError(f"Ingredient with id {ingredient_id} does not exist")

    # Get or create the plate
    plate = _PLATES.get(session_id)
    if plate is None:
        plate = Plate(session_id=session_id, items=[])
        _PLATES[session_id] = plate

    # Check if ingredient already in plate
    existing_item = None
    for item in plate.items:
        if item.ingredient_id == ingredient_id:
            existing_item = item
            break

    if existing_item:
        existing_item.quantity_g = quantity_g
    else:
        plate.items.append(PlateItem(ingredient_id=ingredient_id, quantity_g=quantity_g))

    return plate


def remove_from_plate(session_id: str, ingredient_id: int) -> Plate:
    """
    Remove an ingredient completely from the plate.
    If the plate or ingredient doesn't exist, this is a no-op
    (we just return the current plate state).
    """

    plate = _PLATES.get(session_id)
    if plate is None:
        # If no plate, create an empty one for consistency
        plate = Plate(session_id=session_id, items=[])
        _PLATES[session_id] = plate
        return plate

    plate.items = [item for item in plate.items if item.ingredient_id != ingredient_id]

    return plate
