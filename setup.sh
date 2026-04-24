#!/usr/bin/env bash
set -euo pipefail

# Family Media Manager - Setup script for Ubuntu 24
# Installs Node.js, Ollama, nomic-embed-text, and npm dependencies

echo "==> lissner.io (Ubuntu 24)"
echo ""

# Node.js 20 LTS
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

echo ""
echo "==> Setup complete. Run: npm run dev"
