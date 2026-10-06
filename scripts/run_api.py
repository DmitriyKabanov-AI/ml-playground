"""
Entrypoint для API-контейнера:
  1. Ждёт готовности PostgreSQL
  2. Регистрирует модели в БД (идемпотентно)
  3. Запускает uvicorn с приложением scripts/main.py

Запуск: python scripts/run_api.py   (cwd = /app)
"""
import os
import subprocess
import sys
import time
from pathlib import Path

import psycopg2

# Корень проекта внутри контейнера. Нужен, чтобы uvicorn нашёл пакет `scripts`.
APP_DIR = os.environ.get("APP_DIR", "/app")


def wait_for_db(timeout_s: int = 60, interval_s: int = 2) -> None:
    """Ждёт, пока PostgreSQL начнёт принимать соединения."""
    host = os.environ.get("DB_HOST", "db")
    port = int(os.environ.get("DB_PORT", 5432))
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASSWORD"]
    dbname = os.environ["DB_NAME"]

    print("=== ML Hub API entrypoint ===")
    print(f"DB: {host}:{port}/{dbname}")
    print("Ждём PostgreSQL...")

    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            conn = psycopg2.connect(
                host=host, port=port,
                user=user, password=password, dbname=dbname,
                connect_timeout=2,
            )
            conn.close()
            print("PostgreSQL готов.")
            return
        except Exception:
            print("  ... БД ещё не готова, повтор через 2 сек")
            time.sleep(interval_s)

    print(f"ERROR: PostgreSQL не поднялся за {timeout_s} секунд", file=sys.stderr)
    sys.exit(1)


def register_models() -> None:
    """Запускает scripts/register_models.py как отдельный процесс."""
    print()
    print("=== Регистрация моделей ===")
    script = Path(APP_DIR) / "scripts" / "register_models.py"
    if not script.exists():
        print(f"WARN: {script} не найден, пропускаем")
        return

    result = subprocess.run([sys.executable, str(script)])
    if result.returncode == 0:
        print("Регистрация завершена.")
    else:
        print(f"WARN: register_models.py завершился с кодом {result.returncode}")


def start_api() -> None:
    """Запускает uvicorn через exec — процесс API становится главным."""
    print()
    print("=== Стартуем uvicorn (scripts.main:app) ===")
    # --app-dir добавляет корень проекта в sys.path,
    # чтобы `scripts` был импортируемым пакетом независимо от cwd.
    os.execvp("uvicorn", [
        "uvicorn",
        "scripts.main:app",
        "--app-dir", APP_DIR,
        "--host", "0.0.0.0",
        "--port", "8000",
        "--workers", "1",
    ])


if __name__ == "__main__":
    wait_for_db()
    register_models()
    start_api()