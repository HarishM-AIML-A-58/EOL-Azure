@echo off
setlocal enabledelayedexpansion

:: Set working directory to the project root
cd /d "%~dp0\.."

echo ======================================================
echo Starting FFF Validation Engine (Backend + Frontend)
echo ======================================================

REM --- Backend Setup ---
echo [1/4] Checking Backend environment...
if exist "venv\Scripts\activate.bat" (
    echo [Backend] Virtual environment found.
) else (
    echo [Backend] Creating new virtual environment...
    python -m venv venv
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b !ERRORLEVEL!
    )
    call venv\Scripts\activate.bat
    echo [Backend] Installing dependencies...
    pip install -r backend\requirements.txt
)

REM --- Frontend Setup ---
echo [2/4] Checking Frontend environment...
if exist "frontend\node_modules" (
    echo [Frontend] node_modules found.
) else (
    echo [Frontend] Installing dependencies ^(npm install^)...
    pushd frontend
    call npm install
    popd
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b !ERRORLEVEL!
    )
)

echo [3/4] Checking for existing processes on ports...
REM Check port 8001 (Backend)
netstat -ano | findstr :8001 | findstr LISTENING > nul
if !ERRORLEVEL! EQU 0 (
    echo [WARNING] Port 8001 ^(Backend^) is already in use.
    echo If the app fails to start, please close other instances.
)

REM Check port 5173 (Frontend)
netstat -ano | findstr :5173 | findstr LISTENING > nul
if !ERRORLEVEL! EQU 0 (
    echo [WARNING] Port 5173 ^(Frontend^) is already in use.
    echo If the app fails to start, please close other instances.
)

echo.
echo [4/4] Starting processes...
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:5173
echo.

REM Start Backend in a new window
echo Launching Backend window...
start "FFF Backend" cmd /k "title FFF Backend Server && call venv\Scripts\activate.bat && cd backend\app && python app.py"

REM Start Frontend in this window
echo Starting Frontend in this terminal...
cd frontend
call npm run dev

if !ERRORLEVEL! NEQ 0 (
    echo.
    echo [ERROR] Frontend failed to start or was stopped.
)

pause


