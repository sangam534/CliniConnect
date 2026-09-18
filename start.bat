@echo off
title HELP INDIA - Medical Portal
echo ================================================================
echo  HELP INDIA (MediKiosk) - 1-Click Dependency Installer & Launcher
echo ================================================================
echo.
echo [1/2] Installing required Python dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies. Please ensure Python is installed and added to PATH.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Starting HELP INDIA Server...
echo Open your browser at: http://localhost:5000
echo.
python run.py
pause
