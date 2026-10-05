-- =====================================================================
--  ML Hub · схема PostgreSQL
--  Применяется автоматически при первом запуске контейнера db,
--  через docker-entrypoint-initdb.d/init.sql
-- =====================================================================

-- ---------- Датасеты ----------
CREATE TABLE IF NOT EXISTS datasets (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,              -- 'iris', 'weather_moscow'
    version     TEXT NOT NULL,              -- '2026-10-05' или хеш
    rows        INTEGER,
    path        TEXT,                       -- путь к CSV/parquet
    hash        TEXT,                       -- md5 для детекции изменений
    meta        JSONB DEFAULT '{}',         -- любые доп. поля
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (name, version)
);

-- ---------- Модели ----------
CREATE TABLE IF NOT EXISTS models (
    id          SERIAL PRIMARY KEY,
    task        TEXT NOT NULL,              -- 'classification' | 'regression' | 'forecasting'
    name        TEXT NOT NULL,              -- 'random_forest', 'gradboost'
    dataset_id  INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    path        TEXT NOT NULL,              -- путь к .joblib
    metrics     JSONB NOT NULL,             -- {"mae": 0.32, "r2": 0.81}
    params      JSONB DEFAULT '{}',         -- гиперпараметры
    meta        JSONB DEFAULT '{}',         -- features, classes, station и т.д.
    status      TEXT DEFAULT 'inactive',    -- 'active' | 'inactive' | 'archived'
    version     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_models_task   ON models(task);
CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);

-- Одна активная модель на задачу
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_per_task
    ON models(task) WHERE status = 'active';

-- ---------- Логи предсказаний ----------
CREATE TABLE IF NOT EXISTS predictions (
    id          BIGSERIAL PRIMARY KEY,
    model_id    INTEGER REFERENCES models(id) ON DELETE CASCADE,
    input       JSONB,
    output      JSONB,
    latency_ms  INTEGER,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_model ON predictions(model_id);
