#!/bin/zsh

set -euo pipefail

PROJECT_ROOT="/Users/dheijden003/Library/CloudStorage/OneDrive-PwC/Desktop/Projects/EvolveAI"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

# Check if Supabase is running
echo "Status: checking Supabase status..."
cd "${PROJECT_ROOT}"

if ! supabase status >/dev/null 2>&1; then
  echo "Status: Supabase not running. Starting Supabase..."
  supabase start
  echo "Status: Supabase started. Waiting for services to be ready..."
  sleep 3
else
  echo "Status: Supabase is already running."
fi

# Get Supabase credentials and display them
echo "Status: Supabase credentials:"
supabase status | grep -E "(Project URL|Publishable|Secret)" || true

# Extract and export Supabase credentials as environment variables
# These are session-only and don't pollute .env file
echo "Status: extracting Supabase credentials..."
SUPABASE_STATUS=$(supabase status 2>/dev/null || echo "")
if [ -n "$SUPABASE_STATUS" ]; then
  # Extract API URL (Project URL)
  SUPABASE_URL=$(echo "$SUPABASE_STATUS" | grep -i "API URL" | awk -F': ' '{print $2}' | tr -d '[:space:]' || echo "")
  if [ -z "$SUPABASE_URL" ]; then
    SUPABASE_URL=$(echo "$SUPABASE_STATUS" | grep -i "Project URL" | awk -F': ' '{print $2}' | tr -d '[:space:]' || echo "")
  fi
  
  # Extract anon key (Publishable anon key)
  SUPABASE_ANON_KEY=$(echo "$SUPABASE_STATUS" | grep -i "anon key" | awk -F': ' '{print $2}' | tr -d '[:space:]' || echo "")
  if [ -z "$SUPABASE_ANON_KEY" ]; then
    SUPABASE_ANON_KEY=$(echo "$SUPABASE_STATUS" | grep -i "publishable" | awk -F': ' '{print $2}' | tr -d '[:space:]' || echo "")
  fi
  
  # Extract service_role key
  SUPABASE_SERVICE_ROLE_KEY=$(echo "$SUPABASE_STATUS" | grep -i "service_role key" | awk -F': ' '{print $2}' | tr -d '[:space:]' || echo "")
  
  # Extract JWT secret
  SUPABASE_JWT_SECRET=$(echo "$SUPABASE_STATUS" | grep -i "jwt secret" | awk -F': ' '{print $2}' | tr -d '[:space:]' || echo "")
  
  # Export credentials if found
  if [ -n "$SUPABASE_URL" ]; then
    export SUPABASE_URL
    echo "Status: SUPABASE_URL exported"
  fi
  if [ -n "$SUPABASE_ANON_KEY" ]; then
    export SUPABASE_ANON_KEY
    echo "Status: SUPABASE_ANON_KEY exported"
  fi
  if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    export SUPABASE_SERVICE_ROLE_KEY
    echo "Status: SUPABASE_SERVICE_ROLE_KEY exported"
  fi
  if [ -n "$SUPABASE_JWT_SECRET" ]; then
    export SUPABASE_JWT_SECRET
    echo "Status: SUPABASE_JWT_SECRET exported"
  fi
  echo "Status: Local Supabase credentials loaded (session only)"
else
  echo "Status: Could not extract Supabase credentials - using .env values"
fi

echo "Status: starting backend (uvicorn). Next: launch frontend."
cd "${BACKEND_DIR}"

for venv in "${BACKEND_DIR}/.venv" "${PROJECT_ROOT}/.venv"; do
  if [ -f "${venv}/bin/activate" ]; then
    echo "Status: activating backend virtual environment. Next: launch backend."
    # shellcheck disable=SC1090
    source "${venv}/bin/activate"
    break
  fi
done

if command -v uvicorn >/dev/null 2>&1; then
  UVICORN_CMD=(uvicorn main:app --reload --host 127.0.0.1 --port 8000)
elif command -v python3 >/dev/null 2>&1; then
  UVICORN_CMD=(python3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000)
elif command -v python >/dev/null 2>&1; then
  UVICORN_CMD=(python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000)
else
  echo "Status: missing python runtime. Next: install dependencies and retry."
  exit 1
fi

"${UVICORN_CMD[@]}" &
BACKEND_PID=$!

cleanup() {
  echo "Status: received exit signal. Next: stop backend and Supabase."
  kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  # Note: Supabase will keep running (use 'supabase stop' manually if needed)
  # Uncomment the line below if you want to stop Supabase on script exit:
  # cd "${PROJECT_ROOT}" && supabase stop >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Status: starting frontend (expo dev client). Next: monitor processes."
cd "${FRONTEND_DIR}"
npx expo start --dev-client --ios

wait "${BACKEND_PID}"

