# Piper TTS sidecar (ADR 0012). Piper (piper1-gpl) is GPL-3.0: it stays in THIS container and reaches the service only over HTTP.
# UNVERIFIED in the cloud build (no Docker daemon): the pip package extras, the voice name and the server's request shape
# must be confirmed on the home server - see README "Sprachausgabe pruefen" and task infrastructure-d3v7k.
FROM python:3.12-slim
RUN pip install --no-cache-dir "piper-tts[http]"
RUN python3 -m piper.download_voices de_DE-thorsten-medium --download-dir /voices || true
EXPOSE 5000
CMD ["python3", "-m", "piper.http_server", "-m", "de_DE-thorsten-medium", "--data-dir", "/voices", "--host", "0.0.0.0", "--port", "5000"]
