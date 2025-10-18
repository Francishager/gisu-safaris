# Gisu Safaris FAQ Bot - FastAPI
# Minimal CPU-only image for Transformers + Torch
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Torch needs OpenMP runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY faq_bot/requirements.txt ./faq_bot/requirements.txt
RUN pip install -r faq_bot/requirements.txt

# Copy application code
COPY faq_bot/app ./faq_bot/app
COPY faq_bot/data ./faq_bot/data

# Expose service port
EXPOSE 8000

# Start FastAPI with Uvicorn workers
CMD ["uvicorn", "faq_bot.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
