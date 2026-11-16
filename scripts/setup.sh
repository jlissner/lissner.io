#!/usr/bin/env bash
set -euo pipefail

# Family Media Manager - Setup script for Ubuntu 24
# Installs Node.js, Ollama, nomic-embed-text, npm deps, and ensures dev Postgres.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

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

# Ensure Ollama is running and pull embedding model
echo "==> Ensuring Ollama is running and pulling nomic-embed-text..."
if ! pgrep -x ollama &>/dev/null; then
  (systemctl --user start ollama 2>/dev/null || systemctl start ollama 2>/dev/null) || true
  sleep 2
fi
if ! pgrep -x ollama &>/dev/null; then
  nohup ollama serve >/dev/null 2>&1 &
  sleep 3
fi
ollama pull nomic-embed-text
ollama pull llava

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
