from fastapi import APIRouter, HTTPException, Query

from models.plate import Plate
from services.plate_service import (
    start_session,
    get_plate,
    add_to_plate,
    remove_from_plate,
)

router = APIRouter(
    prefix="",
    tags=["plate"],
)


@router.post("/session/start", response_model=Plate)
def start_new_session():
    #Start a new session and return a Plate object with a session_id.
    return start_session()


@router.get("/plate", response_model=Plate)
def read_plate(session_id: str = Query(..., description="Unique session ID")):
    #Get the current plate for this session.
    plate = get_plate(session_id)
    if plate is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return plate


@router.post("/plate/add", response_model=Plate)
def add_item(session_id: str = Query(...), ingredient_id: int = Query(...), quantity_g: int = Query(...)):
    #Add or increase the quantity of an ingredient in the plate.
    try:
        plate = add_to_plate(session_id, ingredient_id, quantity_g)
        return plate
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/plate/remove", response_model=Plate)
def remove_item(session_id: str = Query(...), ingredient_id: int = Query(...)):
    #Remove an ingredient completely from the plate.
    plate = remove_from_plate(session_id, ingredient_id)
    return plate
