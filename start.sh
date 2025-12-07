#!/bin/zsh

# Production/External Backend Mode - Only starts frontend
# Assumes backend is running on external server (e.g., Render)
# Make sure EXPO_PUBLIC_BACKEND_URL is set to your production backend URL

set -euo pipefail

PROJECT_ROOT="/Users/dheijden003/Library/CloudStorage/OneDrive-PwC/Desktop/Projects/EvolveAI"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"


echo "Status: starting frontend (expo dev client) with external backend. Next: connect to production backend."
cd "${FRONTEND_DIR}"
npx expo start --dev-client --ios

