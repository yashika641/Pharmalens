import fastapi
from app.pages import login_routes
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request, Response
from fastapi import FastAPI

app = FastAPI()

app.include_router(login_routes.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    response: Response = await call_next(request)
    return response

@app.get("/")
async def root():
    return {"message": "Hello World"}

