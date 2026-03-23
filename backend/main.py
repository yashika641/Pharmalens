import os
import logging
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
# deployed via github actions
# -------------------------------------------------
# Logging
# -------------------------------------------------
logging.basicConfig(level=logging.INFO)
logging.info("🚀 FastAPI app starting...")
API_URL = os.getenv("API_URL", "http://localhost:8000")
# -------------------------------------------------
# App
# -------------------------------------------------
app = FastAPI()
# -------------------------------------------------
# CORS
# -------------------------------------------------
origins = [
    # "http://localhost:3000",
    # "http://localhost:5173",
    "https://pharmalenss.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -------------------------------------------------
# Routers (SAFE: no heavy init at import)
# -------------------------------------------------
from backend.routes import login_routes
from backend.routes import scan_routes
from backend.routes import user_profile_routes
from backend.routes import drug_routes
from backend.routes import chatbot_routes
from backend.routes import user_history_routes
from backend.routes import profile_settings
from backend.routes import translate_router


app.include_router(login_routes.router)
app.include_router(scan_routes.router)
app.include_router(user_profile_routes.router)
app.include_router(drug_routes.router)
app.include_router(chatbot_routes.router)
app.include_router(user_history_routes.router)
app.include_router(profile_settings.router)
app.include_router(translate_router.router)


# -------------------------------------------------
# Middleware
# -------------------------------------------------
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    response: Response = await call_next(request)
    return response

from backend.models.chatbot.semantic_search import get_embedding_model

@app.on_event("startup")
def preload_models():
    get_embedding_model()

# -------------------------------------------------
# Health Check
# -------------------------------------------------
@app.get("/")
async def root():
    return {"status": "ok"}
