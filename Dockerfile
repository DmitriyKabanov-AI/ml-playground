FROM python:3.11-slim

# Не писать .pyc, не буферизовать вывод (удобнее логи)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Рабочая папка внутри контейнера
WORKDIR /app

# Системные пакеты, которые нужны некоторым ML-библиотекам
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Сначала только requirements — чтобы кэшировался слой с библиотеками
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Код монтируется через volume, копирование не нужно
EXPOSE 8888

CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"]