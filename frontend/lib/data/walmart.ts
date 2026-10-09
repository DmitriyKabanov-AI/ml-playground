"use client";
import { useJson } from "./loader";

export interface WalmartModelMetrics {
  mae: number; rmse: number; rmsle: number; mape: number;
  r2: number; medae: number; bias: number; max_error: number; evs: number;
}

export interface WalmartModelDiagnostics {
  rmse_over_mae: number;
  mae_over_medae: number;
  abs_bias: number;
}

export interface WalmartCV {
  mape_mean: number; mape_std: number; mae_mean: number; mae_std: number;
}

export interface WalmartModel {
  name: string;
  is_best: boolean;
  metrics: WalmartModelMetrics;
  predictions: number[];
  diagnostics: WalmartModelDiagnostics;
  cv?: WalmartCV;
}

export interface PerStoreRow {
  store: number;
  n_weeks: number;
  avg_sales: number;
  mae: number;
  rmse: number;
  mape: number;
}

export interface Holiday { date: string; icon: string; label: string }

export interface FeatureStat {
  min: number; max: number; mean: number; median: number; std: number;
}

export interface WalmartReport {
  meta: {
    task: string; title: string; subtitle: string; dataset: string;
    target: string; target_unit: string; target_format: string;
    features: string[]; seed: number; generated_at: string;
    n_samples: number; n_features: number; n_train: number; n_test: number;
    target_stats: Record<string, number>;
    store_spread: { ratio_max_min: number; median_min: number; median_max: number } | null;
    holidays: Holiday[];
    series_span?: { start: string; end: string; n_weeks: number; n_stores: number };
    narrative: {
      context: string;
      hero_metric: string;
      why_not_mae: string;
      main_conclusion: string;
    };
  };
  headline: {
    best_model: string;
    best_metric: string;
    best_metric_value: number;
    verdict: string;
  };
  data: {
    y_test: number[];
    stores_test: number[];
    dates_test: string[];
    dates_train: string[];
    stores_train: number[];
    feature_names: string[];
    feature_stats: Record<string, FeatureStat>;
  };
  series_by_store: Record<string, { dates: string[]; sales: number[] }>;
  models: WalmartModel[];
  by_metric: Record<string, string>;
  residual_diagnostics: {
    bias: number; median_residual: number; std_residual: number;
    skew: number; kurtosis: number; pct_beyond_2mae: number;
  };
  per_store: PerStoreRow[];
  feature_importance: Record<string, { name: string; value: number }[]>;
  sample_predictions: Array<{
    features: Record<string, number>;
    actual: number; predicted: number; error: number;
    abs_error: number; within_mae: boolean;
  }>;
  charts: Record<string, string>;
}

export function useWalmartReport() {
  return useJson<WalmartReport>("regression/walmart/report.json");
}

export const WALMART_LABELS: Record<string, string> = {
  Store:         "Магазин",
  Holiday_Flag:  "Праздник",
  Temperature:   "Температура (°F)",
  Fuel_Price:    "Цена топлива ($)",
  CPI:           "CPI",
  Unemployment:  "Безработица (%)",
  year:          "Год",
  month:         "Месяц",
  week:          "Неделя",
};
