from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.ingredients_router import router as ingredients_router
from routers.plate_router import router as plate_router
from routers.impact_router import router as impact_router

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(ingredients_router)
app.include_router(plate_router)
app.include_router(impact_router)

@app.get("/")
def read_root():
    return {"message": "Backend Working"}

@app.get("/health")
def health_check():
    return {"status": "Ts working twizzy"}