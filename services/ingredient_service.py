from pathlib import Path
import json
from typing import List, Optional

from models.ingredients import Ingredient

DATA_DIR = Path(__file__).parent.parent / "data"
INGREDIENTS_FILE = DATA_DIR / "ingredients.json"

def load_ingredients() -> List[Ingredient]:
    #Load all ingredients from the JSON file and return them as a list of Ingredient objects (convert to an Ingredient model before return).
    with INGREDIENTS_FILE.open("r", encoding="utf-8") as f:
        raw_data = json.load(f)

    ingredients = [Ingredient(**item) for item in raw_data]
    return ingredients

def get_ingredient_by_id(ingredient_id: int) -> Optional[Ingredient]:
    #return ingredient by given id
    ingredients = load_ingredients()
    for ingredient in ingredients:
        if ingredient.id == ingredient_id:
            return ingredient
    return None