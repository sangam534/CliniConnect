#!/bin/bash
echo "================================================================"
echo " HELP INDIA (MediKiosk) - 1-Click Dependency Installer & Launcher"
echo "================================================================"
echo ""
echo "[1/2] Installing dependencies..."
python3 -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies. Ensure Python 3 and pip are installed."
    exit 1
fi

echo ""
echo "[2/2] Starting server..."
echo "Open browser at: http://localhost:5000"
echo ""
python3 run.py
