# MOS Phase 1 backend — Fly.io container
FROM python:3.12-slim

# Keep image small; no compile deps needed (all wheels are pure Python)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install deps first (better layer caching)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy app source
COPY app ./app

# Fly proxy expects this internal port (matches fly.toml internal_port)
ENV PORT=8080
EXPOSE 8080

# Single worker — SQLite + in-process state assumed
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
