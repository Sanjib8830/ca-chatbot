#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$project_root"

if [[ ! -f backend/.env ]]; then
  printf '%s\n' 'Missing backend/.env. Copy backend/.env.example to backend/.env and set GOOGLE_API_KEY.' >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm ci
fi

npm run dev &
app_pid=$!

cleanup() {
  kill "$app_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for attempt in {1..30}; do
  if curl --fail --silent --output /dev/null http://127.0.0.1:5173/; then
    break
  fi

  if [[ "$attempt" -eq 30 ]]; then
    printf '%s\n' 'The application did not start at http://127.0.0.1:5173/.' >&2
    exit 1
  fi

  sleep 1
done

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://127.0.0.1:5173/ >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open http://127.0.0.1:5173/ >/dev/null 2>&1 || true
fi

printf '%s\n' 'Ca Chatbot is running at http://127.0.0.1:5173/'
wait "$app_pid"
