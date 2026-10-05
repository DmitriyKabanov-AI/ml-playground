# =====================================================================
#  Один Dockerfile: Jupyter (ML) + FastAPI (api) + Фронт (web)
#  Стадия выбирается через `target:` в docker-compose.yml
# =====================================================================


# ---------------------------------------------------------------------
#  STAGE 1: Jupyter + Python ML
# ---------------------------------------------------------------------
FROM python:3.11-slim AS ml

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        git \
        curl \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8888

CMD ["sh", "-c", "jupyter lab \
    --ip=0.0.0.0 \
    --port=8888 \
    --no-browser \
    --allow-root \
    --ServerApp.token=${JUPYTER_TOKEN}"]


# ---------------------------------------------------------------------
#  STAGE 2: FastAPI (inference API)
#  Модели НЕ копируем — они приходят через volume
# ---------------------------------------------------------------------
FROM python:3.11-slim AS api

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Код API + скрипты (run_api.py + register_models.py)
COPY backend/ ./backend/
COPY scripts/ ./scripts/

EXPOSE 8000

CMD ["python", "/app/scripts/run_api.py"]


# ---------------------------------------------------------------------
#  STAGE 3: сборка фронта (Vite + React)
# ---------------------------------------------------------------------
FROM node:20-alpine AS web-build

WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# ---------------------------------------------------------------------
#  STAGE 4: раздача статики через nginx
# ---------------------------------------------------------------------
FROM nginx:alpine AS web

COPY --from=web-build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80