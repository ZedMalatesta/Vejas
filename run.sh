#!/usr/bin/env bash
# Runs the whole Vejas project locally:
#   - vejas-backend/ (NestJS + Postgres + Redis) via docker compose
#   - the Angular frontend dev server (ng serve)
# Ctrl-C stops the frontend and tears down the backend containers.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/vejas-backend"
BACKEND_URL="http://localhost:3000/health"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "error: $BACKEND_DIR/.env not found (copy .env.example and fill it in)" >&2
  exit 1
fi

cleanup() {
  echo
  echo "Stopping frontend and backend containers..."
  (cd "$BACKEND_DIR" && docker compose down) || true
}
trap cleanup EXIT INT TERM

echo "Building and starting backend (docker compose)..."
(cd "$BACKEND_DIR" && docker compose up -d --build)

echo -n "Waiting for backend to be healthy"
for _ in $(seq 1 60); do
  if curl -sf "$BACKEND_URL" >/dev/null 2>&1; then
    echo " - up!"
    break
  fi
  echo -n "."
  sleep 1
done

if ! curl -sf "$BACKEND_URL" >/dev/null 2>&1; then
  echo
  echo "error: backend did not become healthy in time; logs:" >&2
  (cd "$BACKEND_DIR" && docker compose logs app --tail=100) >&2
  exit 1
fi

echo "Starting frontend (ng serve)..."
cd "$ROOT_DIR" && npm start
