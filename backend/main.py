from dotenv import load_dotenv
import os

# Load env FIRST, before any other imports
load_dotenv("C:\\Users\\palya\\Desktop\\pharmalens\\Pharmalens\\backend\\.env")
import os
print("ENV CHECK:", os.getenv("SUPABASE_URL"))
print("ENV CHECK:", os.getenv("SUPABASE_ANON_KEY"))
import fastapi
from routes import login_routes 
from routes import scan_routes 
from routes import user_profile_routes
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request, Response
from fastapi import FastAPI

app = FastAPI()

app.include_router(login_routes.router)
app.include_router(scan_routes.router)
app.include_router(user_profile_routes.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://1jvc1634-3000.inc1.devtunnels.ms/" # 👈 FRONTEND ORIGIN (EXACT)
    ],
    allow_credentials=True,      # 👈 REQUIRED FOR COOKIES
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

