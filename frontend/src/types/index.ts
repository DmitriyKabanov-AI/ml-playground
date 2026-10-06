/** Контракты данных. */
export interface TaskSummary {
  task: string;
  n_models: number;
  n_active: number;
  category?: Category;
  best?: { name: string; metric: string; value: number; level?: 'good' | 'mid' | 'bad' };
}

export interface ModelRow {
  id: number;
  name: string;
  metrics: Record<string, number>;
  status: 'active' | 'inactive';
}

export interface ActiveModel {
  id: number;
  name: string;
  metrics: Record<string, number>;
  meta: Record<string, unknown>;
}

export type Category = 'classification' | 'regression' | 'forecasting';

/* ── Classification (нормализовано в api_reports.py) ────────────────── */
export interface ClassificationReport {
  classes: string[];
  features: string[];
  confusion: number[][];
  models: { name: string; acc: number; f1: number; precision?: number; recall?: number; balanced_acc?: number }[];
  roc: { cls: string; auc: number; fpr: number[]; tpr: number[] }[];
  importance: { name: string; value: number }[];
  cv: number[];
  points?: { f: number[]; y: number; p: number; test: boolean }[];
}

// Regression — реальная схема artifacts/regression/<name>/report.json
export interface RegressionReport {
  meta?: Record<string, unknown>;
  headline?: {
    best_model?: string;
    best_metric?: string;
    best_metric_value?: number;
    verdict?: string;
  };
  models?: string[];
  by_metric?: Record<string, Record<string, number>>;
  residual_diagnostics?: {
    bias?: number;
    median_residual?: number;
    std_residual?: number;
    skew?: number;
    kurtosis?: number;
    pct_beyond_2mae?: number;
    [k: string]: number | undefined;
  };
  feature_importance?: Record<string, { name: string; value: number }[]>;
  charts?: string[];
  artifacts?: string[];
}

/* ── Forecasting (weather) — реальная схема ─────────────────────────── */
export interface WeatherStation {
  station_id: number | string;
  label?: string;
  n_test?: number;
  best_model?: string;
  hero_value?: number;
  mean_skill?: Record<string, number>;
  mean_mae?: Record<string, number>;
  mae_by_horizon?: Record<string, Record<string, number>>;
  skill_by_horizon?: Record<string, Record<string, number>>;
  [k: string]: unknown;
}

export interface WeatherReport {
  meta?: Record<string, unknown>;
  headline?: {
    best_station?: number | string;
    best_station_label?: string;
    best_model?: string;
    hero_metric?: string;
    hero_value?: number;
    verdict?: string;
    diagnostic_verdict?: Record<string, unknown>;
  };
  stations?: WeatherStation[];
  by_horizon?: Record<string, Record<string, number>>;
  feature_importance?: Record<string, { name: string; value: number }[]>;
  charts?: string[];
  artifacts?: string[];
}

export interface TaskMetrics {
  task: string;
  category: Category;
  active: ActiveModel;
  all_models: ModelRow[];
  report?: ClassificationReport | RegressionReport | WeatherReport;
}

export const asClassification = (r: unknown): ClassificationReport | undefined =>
  r && typeof r === 'object' && 'confusion' in (r as object) ? (r as ClassificationReport) : undefined;
export const asRegression = (r: unknown): RegressionReport | undefined =>
  r && typeof r === 'object' && 'feature_importance' in (r as object) && 'residual_diagnostics' in (r as object)
    ? (r as RegressionReport) : undefined;
export const asWeather = (r: unknown): WeatherReport | undefined =>
  r && typeof r === 'object' && 'stations' in (r as object) ? (r as WeatherReport) : undefined;