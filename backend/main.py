import os
import csv
import time
import logging
from pathlib import Path
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
    "http://localhost:3000",
    "http://localhost:5173",
    "https://pharmalenss.netlify.app",
    "https://pharmalens1.netlify.app",
    "http://192.168.1.34:8000",
    "http://192.168.1.35:8000",
    "http://192.168.1.36:8000",
    "http://192.168.1.37:8000",
    "http://192.168.124.150:8000",
    "http://localhost",
    "https://localhost",            # ← THIS is what your app actually sends
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_TIMING_LOG = Path(__file__).parent / "results" / "request_timings.csv"
_TIMING_LOG.parent.mkdir(exist_ok=True)
if not _TIMING_LOG.exists():
    _TIMING_LOG.write_text("timestamp,method,path,status_code,latency_ms\n", encoding="utf-8")

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    t0       = time.perf_counter()
    response = await call_next(request)
    ms       = round((time.perf_counter() - t0) * 1000, 1)
    path     = request.url.path

    print(f"  {request.method:<7} {path:<45} {response.status_code}  {ms:.0f}ms")

    with open(_TIMING_LOG, "a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow([
            time.strftime("%Y-%m-%d %H:%M:%S"),
            request.method, path, response.status_code, ms,
        ])

    return response
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



@app.on_event("startup")
def preload_models():
    try:
        from backend.models.chatbot.semantic_search import get_embedding_model
        get_embedding_model()
        logging.info("✅ Embedding model preloaded")
    except Exception as e:
        logging.warning(f"⚠️ Embedding model preload skipped: {e}")

# -------------------------------------------------
# Health Check
# -------------------------------------------------
@app.get("/")
async def root():
    return {"status": "ok"}
