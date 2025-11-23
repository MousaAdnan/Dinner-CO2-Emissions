from fastapi import APIRouter, HTTPException
from typing import List

from models.ingredients import Ingredient
from services.ingredient_service import load_ingredients, get_ingredient_by_id

router = APIRouter(
    prefix="/ingredients",
    tags=["ingredients"],
)

@router.get("/", response_model=List[Ingredient])
def get_all_ingredients():
    """
    Return all available ingredients.
    """
    return load_ingredients()


@router.get("/{ingredient_id}", response_model=Ingredient)
def get_single_ingredient(ingredient_id: int):
    """
    Return a single ingredient by ID.
    """
    ingredient = get_ingredient_by_id(ingredient_id)

    if ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    return ingredient
