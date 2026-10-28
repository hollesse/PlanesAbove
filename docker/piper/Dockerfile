# Piper TTS sidecar (ADR 0012). Piper (piper1-gpl) is GPL-3.0: it stays in THIS container and reaches the service only over HTTP.
# Verified (task infrastructure-d3v7k, piper-tts 1.8.0): the `http` extra, the voice download and POST /synthesize {text, voice} -> WAV.
# The voice is loaded at start (-m); other installed voices are selectable per request via `voice`.
FROM python:3.12-slim
RUN pip install --no-cache-dir "piper-tts[http]"
RUN python3 -m piper.download_voices de_DE-thorsten-medium --download-dir /voices
EXPOSE 5000
CMD ["python3", "-m", "piper.http_server", "-m", "de_DE-thorsten-medium", "--data-dir", "/voices", "--host", "0.0.0.0", "--port", "5000"]
