"""
HELP INDIA – National Medical Disease History Portal
FastAPI Backend Application
"""
import os
import time
try:
    from dotenv import load_dotenv
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_file):
        load_dotenv(env_file)
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routes.auth import router as auth_router
from routes.patients import router as patients_router
from routes.upload import router as upload_router
from routes.ai import router as ai_router, MODEL_NAME
from database import get_patients, get_doctors

app = FastAPI(
    title="HELP INDIA Portal API",
    description="Minimalistic, modular Python backend for HELP INDIA medical records and AI triage",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(upload_router)
app.include_router(ai_router)

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

START_TIME = time.time()


@app.get("/api/health")
def health_check():
    patients = get_patients()
    doctors = get_doctors()
    return {
        "status": "ONLINE",
        "service": "HELP INDIA – National Medical Disease History Portal API (Python FastAPI)",
        "version": "2.0.0",
        "uptimeSeconds": int(time.time() - START_TIME),
        "registeredPatientsCount": len(patients),
        "registeredDoctorsCount": len(doctors),
        "aiConfig": {
            "provider": "NVIDIA NIM",
            "model": MODEL_NAME,
            "capabilities": ["summarize", "advice"]
        },
        "disclaimer": "DEMO PROJECT — MOCK DATA — NOT A REAL GOVERNMENT SERVICE"
    }


# Static frontend hosting
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static_frontend")

    @app.get("/")
    def serve_index():
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "HELP INDIA API is running. Frontend index.html not found."}

    # Serve specific static assets if requested at root level (e.g. /css/style.css, /js/app.js)
    @app.get("/css/{file_path:path}")
    def serve_css(file_path: str):
        target = os.path.join(FRONTEND_DIR, "css", file_path)
        if os.path.exists(target):
            return FileResponse(target)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/js/{file_path:path}")
    def serve_js(file_path: str):
        target = os.path.join(FRONTEND_DIR, "js", file_path)
        if os.path.exists(target):
            return FileResponse(target)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/images/{file_path:path}")
    def serve_images(file_path: str):
        target = os.path.join(FRONTEND_DIR, "images", file_path)
        if os.path.exists(target):
            return FileResponse(target)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/logo.png")
    def serve_root_logo():
        target = os.path.join(FRONTEND_DIR, "images", "logo.png")
        if os.path.exists(target):
            return FileResponse(target)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/logo-icon.png")
    def serve_root_logo_icon():
        target = os.path.join(FRONTEND_DIR, "images", "logo-icon.png")
        if os.path.exists(target):
            return FileResponse(target)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

