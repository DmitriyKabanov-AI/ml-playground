# =====================================================================
#  Кастомный образ Spark с ML-пакетами
#
#  Зачем: стандартный apache/spark:3.5.3 не содержит torch, xgboost,
#  statsmodels, sklearn и prophet. PySpark требует, чтобы driver и
#  executor имели одинаковые версии Python и Python-пакетов, иначе
#  notebook сознательно уходит в локальный режим (проверка окружения).
#
#  База: apache/spark:3.5.3-scala2.12-java17-python3-ubuntu — Ubuntu 22.04,
#  Python 3.10. Совпадает с ml-playground (python:3.10-slim-bookworm).
# =====================================================================
FROM apache/spark:3.5.3-scala2.12-java17-python3-ubuntu

USER root

# pip3 и dev-пакеты — часть ML-колёс собирается из исходников
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3-pip \
        python3-dev \
        build-essential \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Версии точно такие же, как в requirements.txt драйвера.
# Меняешь в одном месте — меняй и в другом.
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir \
        numpy==2.1.3 \
        pandas==2.2.3 \
        scipy==1.14.1 \
        scikit-learn==1.5.2 \
        lightgbm==4.5.0 \
        "xgboost>=2.0" \
        "statsmodels>=0.14" \
        prophet==1.1.6

# torch — CPU-сборка, точно как на драйвере (см. STAGE 1 Dockerfile).
# Суффикс +cpu обязателен: PyPI-вариант — это CUDA-сборка.
RUN pip3 install --no-cache-dir \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        "torch==2.14.1+cpu"

USER spark