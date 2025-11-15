#!/bin/zsh

set -euo pipefail

PROJECT_ROOT="/Users/dheijden003/Library/CloudStorage/OneDrive-PwC/Desktop/Projects/EvolveAI"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

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
  echo "Status: received exit signal. Next: stop backend."
  kill "${BACKEND_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Status: starting frontend (expo dev client). Next: monitor processes."
cd "${FRONTEND_DIR}"
npx expo start --dev-client --ios

wait "${BACKEND_PID}"

