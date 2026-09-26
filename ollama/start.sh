#!/bin/sh
# Start Ollama, make sure the model is on the volume, then keep serving.
# Models live on the Railway volume mounted at /root/.ollama, so the ~3.4 GB
# download happens once, not on every deploy.
set -e

ollama serve &
server_pid=$!

until ollama list >/dev/null 2>&1; do
  sleep 1
done

if ollama show "$OLLAMA_PULL_MODEL" >/dev/null 2>&1; then
  echo "[ollama] $OLLAMA_PULL_MODEL already on volume"
else
  echo "[ollama] pulling $OLLAMA_PULL_MODEL (first start only)..."
  ollama pull "$OLLAMA_PULL_MODEL"
fi
echo "[ollama] ready: $OLLAMA_PULL_MODEL"

wait "$server_pid"
