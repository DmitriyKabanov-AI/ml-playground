# =====================================================================
#  Один Dockerfile: Jupyter (ML) + FastAPI (api) + Фронт (web)
#  Стадия выбирается через `target:` в docker-compose.yml
# =====================================================================


# ---------------------------------------------------------------------
#  STAGE 1: Jupyter + Python ML + PySpark
#
#  python:3.10-slim-bookworm — потому что образ apache/spark:3.5.x
#  основан на Ubuntu 22.04, где Python 3.10. PySpark жёстко требует
#  совпадения minor-версии Python на driver и executor.
#
#  bookworm (Debian 12) — потому что в trixie (Debian 13) нет
#  пакета openjdk-17-jre-headless, а Spark 3.5.x не поддерживает Java 21.
#
#  torch ставим CPU-сборкой (+cpu) — CUDA-вариант весит 2.5 GB и
#  требует GPU, которого на Spark-worker нет. Тот же +cpu — на
#  кастомном Spark-образе (см. ./spark/Dockerfile), иначе notebook
#  заметит разницу версий и уйдёт в локальный режим.
# ---------------------------------------------------------------------
FROM python:3.10-slim-bookworm AS ml

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Java 17 нужна PySpark 3.5.x (JVM под капотом).
# procps — Spark-лаунчер дергает ps для диагностики.
# bash — Spark-скрипты в /opt/spark/bin/* написаны на bash.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        git \
        curl \
        libgomp1 \
        openjdk-17-jre-headless \
        procps \
        bash \
    && rm -rf /var/lib/apt/lists/*

# PySpark ищет java через JAVA_HOME. Без этого — "JAVA_HOME is not set".
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Driver и executor должны использовать один и тот же python.
# python:3.10-slim и apache/spark:python3-ubuntu оба имеют /usr/bin/python3.
ENV PYSPARK_PYTHON=/usr/bin/python3
ENV PYSPARK_DRIVER_PYTHON=/usr/bin/python3

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install --no-cache-dir \
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
RUN pip install --upgrade pip && pip install -r requirements.txt

# Код API + скрипты: main.py, run_api.py, register_models.py
COPY scripts/ ./scripts/

# Страховка: пакет `scripts` должен быть импортируемым,
# иначе uvicorn не найдёт `scripts.main:app`.
RUN touch scripts/__init__.py

EXPOSE 8000

CMD ["python", "/app/scripts/run_api.py"]


# ---------------------------------------------------------------------
#  STAGE 3: сборка фронта (Next.js static export → out/)
#
#  Next.js с `output: "export"` (см. frontend/next.config.js)
#  собирает статику в /app/out, а не в /app/dist.
#
#  public/artifacts и public/models на хосте — это junction
#  (символические ссылки Windows), которые не переносятся в
#  Linux-контейнер. Их отсекает .dockerignore, а здесь мы создаём
#  пустые папки, потому что next build проверяет наличие всех путей
#  внутри public/. Реальные артефакты попадут в nginx через volume.
# ---------------------------------------------------------------------
FROM node:20-alpine AS web-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Пустые заглушки для junction-путей из public/ —
# next build делает stat() по каждому пути и падает на ENOENT,
# если папки нет физически.
RUN mkdir -p public/artifacts public/models

RUN npm run build


# ---------------------------------------------------------------------
#  STAGE 4: раздача статики через nginx
#
#  Next.js static export кладёт всё в /app/out (см. output: "export").
#  Артефакты монтируются снаружи через docker-compose.volumes.
# ---------------------------------------------------------------------
FROM nginx:alpine AS web

COPY --from=web-build /app/out /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80