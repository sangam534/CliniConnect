"""
HELP INDIA (MediKiosk) - Root Runner Script
Allows running the project directly from root:
    python run.py
"""
import os
import sys
import uvicorn

# Ensure backend directory is in path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"================================================================")
    print(f" HELP INDIA (MediKiosk) - National Medical History Portal")
    print(f" Server running at: http://localhost:{port}")
    print(f" Health Check:      http://localhost:{port}/api/health")
    print(f"================================================================")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, app_dir=backend_dir)
