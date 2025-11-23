from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Backend Working"}

@app.get("/health")

def health_check():
    return {"status": "Ts working twizzy"}