# =====================================================================
#  Кастомный образ Spark с ML-пакетами
#
#  База: apache/spark:3.5.3 — Ubuntu 22.04, Python 3.10.
#  Совпадает с ml-playground (python:3.10-slim-bookworm).
#
#  Версии Python-пакетов здесь должны посимвольно совпадать
#  с requirements.txt драйвера, иначе notebook уйдёт в локальный режим.
#
#  xgboost, catboost, torch ставятся с --no-deps / из CPU-индекса —
#  иначе тянут 1.6 GB nvidia-колёс, ненужных на CPU.
# =====================================================================
FROM apache/spark:3.5.3-scala2.12-java17-python3-ubuntu

USER root

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3-pip \
        python3-dev \
        build-essential \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 1) Всё, кроме xgboost, catboost, torch — они отдельно
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir \
        numpy==2.1.3 \
        pandas==2.2.3 \
        scipy==1.14.1 \
        pyarrow>=17.0 \
        fastparquet>=2024.5.0 \
        scikit-learn==1.5.2 \
        lightgbm==4.5.0 \
        "statsmodels>=0.14" \
        prophet==1.1.6 \
        meteostat==1.6.8 \
        imbalanced-learn>=0.12

# 2) xgboost без nvidia-зависимостей
RUN pip3 install --no-cache-dir --no-deps "xgboost>=2.0"

# 3) catboost без nvidia-зависимостей
RUN pip3 install --no-cache-dir --no-deps "catboost>=1.2"

# 4) torch — CPU-сборка
RUN pip3 install --no-cache-dir \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        "torch==2.14.1+cpu"

USER spark