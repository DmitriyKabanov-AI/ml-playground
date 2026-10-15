# =====================================================================
#  Один Dockerfile: Jupyter (ML) + FastAPI (api) + Фронт (web)
#  Стадия выбирается через `target:` в docker-compose.yml
# =====================================================================


# ---------------------------------------------------------------------
#  STAGE 1: Jupyter + Python ML + PySpark
#
#  python:3.10-slim-bookworm — образ apache/spark:3.5.x основан на
#  Ubuntu 22.04 с Python 3.10. PySpark требует совпадения minor-версии
#  Python на driver и executor.
#
#  bookworm (Debian 12) — в trixie (Debian 13) нет openjdk-17,
#  а Spark 3.5.x не поддерживает Java 21.
#
#  torch, xgboost, catboost ставятся отдельно — их PyPI-метаданные
#  включают nvidia-* колёса (~1.6 GB), нужные только для GPU. На CPU
#  они мертвы. Ставим с --no-deps, чтобы не тащить.
# ---------------------------------------------------------------------
FROM python:3.10-slim-bookworm AS ml

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        git \
        curl \
        libgomp1 \
        openjdk-17-jre-headless \
        procps \
        bash \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

ENV PYSPARK_PYTHON=/usr/bin/python3
ENV PYSPARK_DRIVER_PYTHON=/usr/bin/python3

WORKDIR /app

# 1) Основные зависимости из requirements.txt
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# 2) xgboost без nvidia-зависимостей
RUN pip install --no-cache-dir --no-deps "xgboost>=2.0"

# 3) catboost без nvidia-зависимостей
RUN pip install --no-cache-dir --no-deps "catboost>=1.2"

# 4) torch — CPU-сборка (+cpu)
RUN pip install --no-cache-dir \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        --force-reinstall --no-deps \
        "torch==2.14.1+cpu"

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
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_DIR=/app \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install --no-cache-dir --no-deps "xgboost>=2.0" && \
    pip install --no-cache-dir --no-deps "catboost>=1.2"

COPY scripts/ ./scripts/
RUN touch scripts/__init__.py

EXPOSE 8000

CMD ["python", "/app/scripts/run_api.py"]


# ---------------------------------------------------------------------
#  STAGE 3: сборка фронта (Next.js static export → out/)
# ---------------------------------------------------------------------
FROM node:20-alpine AS web-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

RUN mkdir -p public/artifacts public/models

RUN npm run build


# ---------------------------------------------------------------------
#  STAGE 4: раздача статики через nginx
# ---------------------------------------------------------------------
FROM nginx:alpine AS web

COPY --from=web-build /app/out /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80