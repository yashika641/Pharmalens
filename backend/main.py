import os

PORT = int(os.getenv("PORT", 8000))
from dotenv import load_dotenv
import os
import os
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
# Load env FIRST, before any other imports
load_dotenv("C:\\Users\\palya\\Desktop\\pharmalens\\Pharmalens\\backend\\.env")
import os
print("ENV CHECK:", os.getenv("SUPABASE_URL"))
print("ENV CHECK:", os.getenv("SUPABASE_ANON_KEY"))
import fastapi
from backend.routes import login_routes 
from backend.routes import scan_routes 
from backend.routes import user_profile_routes
from backend.routes import drug_routes
# from backend.routes import chatbot_routes
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request, Response
from fastapi import FastAPI
import logging
logging.basicConfig(level=logging.INFO)
logging.info("🚀 FastAPI app starting...")

app = FastAPI()

qdrant = None
embedding_model = None


@app.on_event("startup")
def startup():
    global qdrant, embedding_model

    QDRANT_URL = os.getenv("QDRANT_URL")
    QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

    if not QDRANT_URL or not QDRANT_API_KEY:
        raise RuntimeError("Qdrant env vars missing")

    qdrant = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        prefer_grpc=False,
        timeout=30,
    )

    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

    print("✅ Qdrant & embedding model initialized")

app.include_router(login_routes.router)
app.include_router(scan_routes.router)
app.include_router(user_profile_routes.router)
app.include_router(drug_routes.router)
# app.include_router(chatbot_routes.router)
origins = [
    "http://localhost:3000",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://pharmalenss.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

