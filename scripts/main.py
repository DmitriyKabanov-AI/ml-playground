"""
ML Hub API — метаданные моделей + inference.
Эндпоинты:
  GET  /health
  GET  /tasks
  GET  /tasks/{task}/models
  GET  /tasks/{task}/active
  GET  /tasks/{task}/metrics
  POST /predict/{task}
  POST /reload
"""
import json
import os
import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

from scripts.api_reports import get_report


def get_conn():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "db"),
        port=int(os.environ.get("DB_PORT", 5432)),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        dbname=os.environ["DB_NAME"],
        cursor_factory=RealDictCursor,
    )


app = FastAPI(title="ML Hub API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict[int, Any] = {}


def load_model(model_id: int, path: str):
    if model_id in _cache:
        return _cache[model_id]
    p = Path(path)
    if not p.exists():
        alt = Path("/app") / p.relative_to(p.anchor) if p.is_absolute() else p
        if not alt.exists():
            raise HTTPException(404, f"Модель не найдена: {path}")
        p = alt
    m = joblib.load(p, mmap_mode="r")
    _cache[model_id] = m
    return m


class PredictRequest(BaseModel):
    features: list[float]


# ---------- базовые ----------

@app.get("/health")
def health():
    try:
        conn = get_conn(); cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS n FROM models")
        n = cur.fetchone()["n"]
        conn.close()
        return {"status": "ok", "models_in_db": n}
    except Exception as e:
        raise HTTPException(500, f"DB error: {e}")


@app.get("/tasks")
def list_tasks():
    conn = get_conn(); cur = conn.cursor()
    cur.execute("""
        SELECT task, COUNT(*) AS n_models,
               COUNT(*) FILTER (WHERE status='active') AS n_active
        FROM models GROUP BY task ORDER BY task
    """)
    rows = cur.fetchall()
    conn.close()
    return rows


@app.get("/tasks/{task}/models")
def list_models(task: str):
    conn = get_conn(); cur = conn.cursor()
    cur.execute("""
        SELECT id, name, metrics, status, version, created_at
        FROM models WHERE task = %s ORDER BY id
    """, (task,))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        raise HTTPException(404, f"Нет моделей для '{task}'")
    return {"task": task, "models": rows}


@app.get("/tasks/{task}/active")
def active_model(task: str):
    conn = get_conn(); cur = conn.cursor()
    cur.execute("""
        SELECT id, name, path, metrics, meta, version, created_at
        FROM models WHERE task = %s AND status = 'active' LIMIT 1
    """, (task,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, f"Нет активной модели для '{task}'")
    return {"task": task, **row}


# ---------- для фронта: сводка метрик ----------

@app.get("/tasks/{task}/metrics")
def metrics_for_task(task: str):
    """
    Всё, что нужно фронту для страницы одной задачи:
      - активная модель и её метрики
      - все модели задачи с метриками (для сравнительной таблицы)
      - метаданные (features, classes, target, горизонты и т.д.)
    """
    conn = get_conn(); cur = conn.cursor()

    cur.execute("""
        SELECT id, name, metrics, status, version, meta, created_at
        FROM models WHERE task = %s ORDER BY id
    """, (task,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(404, f"Нет моделей для '{task}'")

    active = next((r for r in rows if r["status"] == "active"), rows[0])
    category = task.split("_", 1)[0]  # classification / regression / forecasting

    payload = {
        "task": task,
        "category": category,
        "active": {
            "id": active["id"],
            "name": active["name"],
            "metrics": active["metrics"],
            "meta": active["meta"],
        },
        "all_models": [
            {
                "id": r["id"],
                "name": r["name"],
                "metrics": r["metrics"],
                "status": r["status"],
            }
            for r in rows
        ],
    }

    rep = get_report(task)
    if rep is not None:
        payload["report"] = rep

    return payload


# ---------- inference ----------

@app.post("/predict/{task}")
def predict(task: str, req: PredictRequest):
    conn = get_conn(); cur = conn.cursor()
    cur.execute("""
        SELECT id, name, path FROM models
        WHERE task = %s AND status = 'active' LIMIT 1
    """, (task,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, f"Нет активной модели для '{task}'")

    model = load_model(row["id"], row["path"])
    X = np.array([req.features], dtype="float32")

    t0 = time.time()
    try:
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X).tolist()
            pred = int(np.argmax(proba[0]))
            out = {"prediction": pred, "proba": proba[0]}
        else:
            pred = model.predict(X).tolist()
            out = {"prediction": pred}
    except Exception as e:
        conn.close()
        raise HTTPException(500, f"Inference error: {e}")

    latency_ms = int((time.time() - t0) * 1000)

    try:
        cur.execute("""
            INSERT INTO predictions (model_id, input, output, latency_ms)
            VALUES (%s, %s, %s, %s)
        """, (row["id"], json.dumps({"features": req.features}),
              json.dumps(out), latency_ms))
        conn.commit()
    except Exception:
        conn.rollback()
    conn.close()

    out["model"] = row["name"]
    out["latency_ms"] = latency_ms
    return out


@app.post("/reload")
def reload_cache():
    n = len(_cache)
    _cache.clear()
    return {"status": "cache cleared", "evicted": n}
