#!/bin/bash
echo "Starting FFF Validation Engine (Backend + Frontend)..."

# --- Backend Setup ---
if [ -d "venv" ]; then
    echo "[Backend] Virtual environment found."
    source venv/bin/activate
else
    echo "[Backend] Creating new virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "[Backend] Installing dependencies..."
    pip install -r requirements.txt
fi

# --- Frontend Setup ---
if [ -d "node_modules" ]; then
    echo "[Frontend] node_modules found."
else
    echo "[Frontend] Installing dependencies (npm install)..."
    npm install
fi

echo ""
echo "Starting processes..."
echo "Backend: http://localhost:8001"
echo "Frontend: http://localhost:5173"
echo ""

# Start Backend in background
python3 app.py &
BACKEND_PID=$!

# Start Frontend in foreground
echo "Starting Frontend..."
npm run dev

# Cleanup background process on exit
kill $BACKEND_PID
