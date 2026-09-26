# Private Ollama inference service for evidence analysis.
# Deployed as its own Railway service with NO public domain: Ollama has no
# authentication, so it must only be reachable over the private network
# (http://ollama.railway.internal:11434 from the app).
# Same version benchmarked locally.
FROM ollama/ollama:0.34.4

# OLLAMA_HOST          listen on IPv6 and IPv4 (Railway private network)
# OLLAMA_NUM_PARALLEL  one request at a time: on CPU, parallel requests only
#                      slow each other down
# OLLAMA_KEEP_ALIVE    unload the model after 5 idle minutes, so its RAM is
#                      only billed while analyses are running
ENV OLLAMA_HOST=[::]:11434 \
    OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_KEEP_ALIVE=5m \
    OLLAMA_PULL_MODEL=qwen3.5:4b

COPY start.sh /start.sh
ENTRYPOINT ["/bin/sh", "/start.sh"]
