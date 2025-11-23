from pathlib import Path
import sys

# --- Make sure the project root is on sys.path ---
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# --- Now regular FastAPI imports ---
from fastapi import FastAPI
from routers.ingredients_router import router as ingredients_router

app = FastAPI()

# Register routers
app.include_router(ingredients_router)


@app.get("/")
def read_root():
    return {"message": "Hello from the Climate Impact Backend!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
