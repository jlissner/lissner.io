#!/usr/bin/env bash
set -euo pipefail

# Family Media Manager - Setup script for Ubuntu 24
# Installs Node.js, Ollama, embedding/vision models, npm deps, and ensures dev Postgres.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

env_get() {
  local key="$1" file value=""
  for file in "$ROOT/config/.env.local" "$ROOT/config/.env"; do
    [[ -f "$file" ]] || continue
    value="$(grep -E "^${key}=" "$file" | tail -1 | cut -d= -f2- | tr -d '\r"' || true)"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
  done
  printf ''
}

# Exported env → config files → defaults (same as host:pull / docker/ollama).
resolve_model() {
  local key="$1" default="$2" from_env
  from_env="$(printenv "$key" 2>/dev/null || true)"
  if [[ -n "$from_env" ]]; then
    printf '%s' "$from_env"
    return 0
  fi
  from_env="$(env_get "$key")"
  if [[ -n "$from_env" ]]; then
    printf '%s' "$from_env"
    return 0
  fi
  printf '%s' "$default"
}

EMBED_MODEL="$(resolve_model OLLAMA_EMBED_MODEL nomic-embed-text)"
VISION_MODEL="$(resolve_model OLLAMA_VISION_MODEL llava)"

echo "==> lissner.io (Ubuntu 24)"
echo ""

# Node.js 24
if ! command -v node &>/dev/null; then
  echo "==> Installing Node.js 24..."
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "==> Node.js $(node -v) already installed"
fi

# Ollama
if ! command -v ollama &>/dev/null; then
  echo "==> Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "==> Ollama already installed"
fi

# Ensure Ollama is running and pull configured models
echo "==> Ensuring Ollama is running and pulling ${EMBED_MODEL} + ${VISION_MODEL}..."
if ! pgrep -x ollama &>/dev/null; then
  (systemctl --user start ollama 2>/dev/null || systemctl start ollama 2>/dev/null) || true
  sleep 2
fi
if ! pgrep -x ollama &>/dev/null; then
  nohup ollama serve >/dev/null 2>&1 &
  sleep 3
fi
ollama pull "$EMBED_MODEL"
ollama pull "$VISION_MODEL"

# npm dependencies
echo "==> Installing npm dependencies..."
npm install

# Dev Postgres (Compose project lissnerio-dev) — never touches prod volume
if ! command -v docker &>/dev/null; then
  echo "==> Docker not found; skip dev Postgres. Install Docker, then: npm run db:up"
elif [[ ! -f "$ROOT/config/.env.local" ]] && [[ ! -f "$ROOT/config/.env" ]]; then
  echo "==> No config/.env.local (or .env); skip Postgres. Copy config/.env.example and set POSTGRES_*."
else
  if ss -tln 2>/dev/null | grep -qE ':5432\b' || \
     (command -v lsof >/dev/null 2>&1 && lsof -iTCP:5432 -sTCP:LISTEN -n -P >/dev/null 2>&1); then
    if ! bash scripts/docker-compose-dev.sh ps --status running postgres 2>/dev/null | grep -q postgres; then
      echo "==> Port 5432 is in use but dev Postgres is not running."
      echo "    If this is the Canonical snap: sudo snap stop postgresql && sudo snap disable postgresql"
      echo "    Then re-run: npm run db:up"
    fi
  fi

  echo "==> Starting dev Postgres (lissnerio-dev)..."
  npm run db:up

  echo "==> Applying media migrations..."
  npm run db:migrate:media

  echo "==> Checkpoint..."
  npm run db:checkpoint || true
fi

echo ""
echo "==> Setup complete. Run: npm run dev"
echo "    Prod stack (separate Postgres on :5433): npm run host"
echo "    Stop Node/Ollama only: npm run dev:stop  |  stop dev DB: npm run db:down"
