#!/bin/bash
# Startup script for Azure App Service
# The app is located in backend/app/app.py relative to the deployment root if deploying the backend folder
# Or just app/app.py if the backend folder is the root.

# Install dependencies if not already handled by Azure (though it usually is)
pip install -r requirements.txt

# Start uvicorn
# We use app.app:app because the structure is app/app.py and the class is 'app'
python -m uvicorn app.app:app --host 0.0.0.0 --port 8000
