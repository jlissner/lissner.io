#!/bin/sh
set -e

embed="${OLLAMA_EMBED_MODEL:-nomic-embed-text}"
vision="${OLLAMA_VISION_MODEL:-llava}"

rm -f /tmp/ollama-models-ready

ollama serve &
serve_pid=$!

until ollama list >/dev/null 2>&1; do
  sleep 0.5
done

ollama pull "$embed"
ollama pull "$vision"

kill "$serve_pid" 2>/dev/null || true
wait "$serve_pid" 2>/dev/null || true

touch /tmp/ollama-models-ready

exec ollama serve
