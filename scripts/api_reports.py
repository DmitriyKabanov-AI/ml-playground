"""Normalizes artifacts/*.json into the shape expected by the frontend."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = PROJECT_ROOT / "artifacts"


def _read_json(p: Path) -> Optional[dict]:
    try:
        with p.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _candidate_paths(task: str) -> list[Path]:
    parts = task.split("_", 1)
    if len(parts) != 2:
        return []
    cat, tail = parts
    names: list[str] = [tail]
    if cat == "forecasting" and tail.startswith("weather"):
        names.insert(0, "weather")
    if cat == "classification" and "_" in tail:
        names.append(tail.rsplit("_", 1)[0])

    out: list[Path] = []
    for name in names:
        for fname in ("results.json", "report.json"):
            out.append(ARTIFACTS / cat / name / fname)
    return out


def _parse_confusion(raw: Any) -> list[list[int]]:
    if not raw:
        return []
    if isinstance(raw[0], list):
        return [[int(x) for x in row] for row in raw]
    return [[int(x) for x in str(row).split()] for row in raw]


def _normalize_classification(raw: dict) -> dict:
    src = raw.get("classification", raw)
    return {
        "classes": src.get("classes", []),
        "features": src.get("features", []),
        "confusion": _parse_confusion(src.get("confusion", [])),
        "models": src.get("models", []),
        "roc": src.get("roc", []),
        "importance": src.get("importance", []),
        "cv": src.get("cv", []),
        "points": src.get("points", []),
    }


@lru_cache(maxsize=256)
def get_report(task: str) -> Optional[dict[str, Any]]:
    for p in _candidate_paths(task):
        data = _read_json(p)
        if isinstance(data, dict) and data:
            cat = task.split("_", 1)[0]
            if cat == "classification":
                return _normalize_classification(data)
            return data  # regression / forecasting — pass-through
    return None


def list_artifact_tasks() -> list[str]:
    if not ARTIFACTS.exists():
        return []
    out: set[str] = set()
    for pattern in ("*/*/results.json", "*/*/report.json"):
        for p in ARTIFACTS.glob(pattern):
            cat, name = p.parts[-3], p.parts[-2]
            out.add(f"{cat}_{name}")
    return sorted(out)