from typing import Dict, List, Optional
from uuid import uuid4

from models.plate import Plate, PlateItem
from services.ingredient_service import get_ingredient_by_id

_PLATES: Dict[str, Plate] = {}

def start_session() -> Plate:
    #Create a new plate(session) and return the Plate object
    session_id = uuid4().hex
    plate = Plate(session_id=session_id, items=[])
    _PLATES[session_id] = plate
    return plate

def get_plate(session_id: str) -> Optional[Plate]:
    #Retrieve plate with given ID
    return _PLATES.get(session_id)

def add_to_plate(session_id: str, ingredient_id: int, quantity_g: int) -> Plate:
    #add item to plate
    ingredient = get_ingredient_by_id(ingredient_id)
    if ingredient is None:
        raise ValueError(f"Ingredient with id {ingredient_id} does not exist")
    
    plate = _PLATES.get(session_id)
    if plate is None:
        plate = Plate(session_id=session_id, items=[])
        _PLATES[session_id] = plate

        for item in plate.items:
            if item.ingredient_id == ingredient_id:
                item.quantity_g += quantity_g
                break
        else:
            plate.items.append(PlateItem(ingredient_id=ingredient_id, quantity_g=quantity_g))
        
        return plate
    
def remove_from_plate(session_id: str, ingredient_id: int) -> Plate:
    #remove item from plate
    plate = _PLATES.get(session_id)
    if(plate is None):
        plate = Plate(session_id=session_id, items=[])
        _PLATES[session_id] = plate
        return plate
    
    plate.items = [
        item for item in plate.items
        if item.ingredient_id != ingredient_id
    ]

    return plate