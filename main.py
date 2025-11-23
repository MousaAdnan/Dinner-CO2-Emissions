from fastapi import FastAPI
from routers.ingredients_router import router as ingredients_router

app = FastAPI()
app.include_router(ingredients_router)

@app.get("/")
def read_root():
    return {"message": "Backend Working"}

@app.get("/health")

def health_check():
    return {"status": "Ts working twizzy"}