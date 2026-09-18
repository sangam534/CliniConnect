"""
Runner script for HELP INDIA backend
Usage:
    python run.py
"""
import uvicorn
import os
import sys

# Ensure backend directory is on python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting HELP INDIA Python FastAPI Server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
