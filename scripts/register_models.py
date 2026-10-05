"""
Сканирует models/**/*.json и регистрирует модели в PostgreSQL.

ВАЖНО: при каждом запуске полностью сбрасывает состояние БД
(TRUNCATE models, datasets) — поэтому безопасно вызывать из entrypoint.

Task формируется как `<category>_<slug>[_<station>]`:
    classification_iris
    classification_breast_cancer_fp
    regression_housing
    forecasting_weather_20107

Запуск: docker compose exec ml python scripts/register_models.py
"""
import json
import os
from pathlib import Path

import psycopg2
from psycopg2.extras import Json


def get_conn():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "db"),
        port=int(os.environ.get("DB_PORT", 5432)),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        dbname=os.environ["DB_NAME"],
    )


CATEGORIES = ("classification", "regression", "forecasting")


def category_from_path(json_path: Path) -> str | None:
    parts = [p.lower() for p in json_path.parts]
    for cat in CATEGORIES:
        if cat in parts:
            return cat
    return None


def slug_from_path(json_path: Path) -> str:
    return json_path.parent.name.lower()


def build_task(meta: dict, json_path: Path) -> str:
    cat = category_from_path(json_path)
    if not cat:
        return "unknown"
    slug = slug_from_path(json_path)
    task = f"{cat}_{slug}"
    if cat == "forecasting":
        st = meta.get("station")
        if st is not None:
            task = f"{task}_{st}"
    return task


def extract_metrics(meta: dict) -> dict:
    m = meta.get("metrics")
    if isinstance(m, dict) and m:
        return {k: v for k, v in m.items() if isinstance(v, (int, float))}

    m = meta.get("metrics_at_optimal")
    if isinstance(m, dict) and m:
        return {k: v for k, v in m.items() if isinstance(v, (int, float))}

    out = {}
    mae = meta.get("mae_rf_by_horizon")
    if isinstance(mae, dict) and mae:
        out["mae_avg"] = sum(mae.values()) / len(mae)
    sk = meta.get("skill_rf_by_horizon")
    if isinstance(sk, dict) and sk:
        out["skill_avg"] = sum(sk.values()) / len(sk)
    return out


def register_dataset(cur, task: str, meta: dict) -> int:
    version = str(meta.get("version") or meta.get("saved_at", "unknown"))[:10]
    name = str(meta.get("dataset") or meta.get("station_label") or task)

    cur.execute("""
        INSERT INTO datasets (name, version, path, meta)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """, (name, version, meta.get("dataset_path"), Json({})))
    return cur.fetchone()[0]


def register_model(cur, task: str, meta: dict, json_path: Path):
    model_name = str(meta.get("model") or json_path.stem)
    model_path = str(json_path.with_suffix(".joblib"))
    metrics = extract_metrics(meta)
    params = meta.get("params") or {}
    version = str(meta.get("saved_at") or json_path.stem)[:19]

    dataset_id = register_dataset(cur, task, meta)
    extra_meta = {k: v for k, v in meta.items()
                  if k not in ("metrics", "params", "metrics_at_optimal")}

    cur.execute("""
        INSERT INTO models
            (task, name, dataset_id, path, metrics, params, meta, status, version)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'inactive', %s)
        RETURNING id
    """, (task, model_name, dataset_id, model_path,
          Json(metrics), Json(params), Json(extra_meta), version))
    return cur.fetchone()[0]


def pick_active_models(cur):
    rules = {
        "classification": ("f1_macro",  "DESC"),
        "regression":     ("rmse",      "ASC"),
        "forecasting":    ("skill_avg", "DESC"),
    }
    cur.execute("SELECT DISTINCT task FROM models")
    tasks = [r[0] for r in cur.fetchall()]

    for task in tasks:
        metric = direction = None
        for prefix, (m, d) in rules.items():
            if task.startswith(prefix):
                metric, direction = m, d
                break
        if metric is None:
            continue

        sql = f"""
            SELECT id FROM models
            WHERE task=%s AND metrics ? %s
            ORDER BY (metrics->>%s)::float {direction}
            LIMIT 1
        """
        cur.execute(sql, (task, metric, metric))
        row = cur.fetchone()
        if not row:
            continue
        best_id = row[0]
        cur.execute("UPDATE models SET status='inactive' WHERE task=%s", (task,))
        cur.execute("UPDATE models SET status='active' WHERE id=%s", (best_id,))
        print(f"  [{task:40s}] active = id {best_id:3d} ({metric} {direction})")


def main():
    models_root = Path("/app") / "models"
    json_files = sorted(models_root.glob("**/*.json"))
    print(f"Найдено JSON-метаданных: {len(json_files)}")

    conn = get_conn()
    cur = conn.cursor()

    # ВАЖНО: полный сброс перед регистрацией
    # (чтобы не накапливались старые task'и при смене логики)
    print("Сброс БД (TRUNCATE models, datasets)...")
    cur.execute("TRUNCATE predictions, models, datasets RESTART IDENTITY CASCADE;")
    conn.commit()
    print()

    inserted = 0
    for jp in json_files:
        if jp.name.startswith("."):
            continue
        try:
            meta = json.loads(jp.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  [SKIP] {jp.name}: {e}")
            continue
        task = build_task(meta, jp)
        if task == "unknown":
            print(f"  [SKIP] {jp.name}: task не определён")
            continue
        mid = register_model(cur, task, meta, jp)
        print(f"  [ADD] {task:40s} | id={mid:3d} | {jp.name}")
        inserted += 1

    conn.commit()
    print()
    print(f"Вставлено: {inserted}")
    print()
    print("Выбор активных моделей:")
    pick_active_models(cur)
    conn.commit()

    cur.execute("""
        SELECT task, COUNT(*),
               COUNT(*) FILTER (WHERE status='active') AS n_active
        FROM models GROUP BY task ORDER BY task
    """)
    print()
    print("Итого в БД по задачам:")
    for task, cnt, na in cur.fetchall():
        mark = "OK" if na == 1 else "!!"
        print(f"  [{mark}] {task:40s}: {cnt} моделей, активных {na}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
