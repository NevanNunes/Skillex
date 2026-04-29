#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/../.venv/bin/python}"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="${PYTHON_BIN_FALLBACK:-python3}"
fi

DB_USER="${DB_USER:-$(whoami)}"
DB_PASSWORD="${DB_PASSWORD:-nevan}"
DB_NAME="${DB_NAME:-skillex}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:${BACKEND_PORT} ..."
(
  cd "$BACKEND_DIR"
  DB_USER="$DB_USER" \
  DB_PASSWORD="$DB_PASSWORD" \
  DB_NAME="$DB_NAME" \
  DB_HOST="$DB_HOST" \
  DB_PORT="$DB_PORT" \
  "$PYTHON_BIN" manage.py runserver "0.0.0.0:${BACKEND_PORT}"
) &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:${FRONTEND_PORT} ..."
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

echo "Both services started. Press Ctrl+C to stop both."
wait
