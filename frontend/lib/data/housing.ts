"use client";
import { useJson } from "./loader";

export interface HousingFeatureStats {
  min: number; max: number; mean: number; median: number; std: number;
}
export interface HousingModelMetrics {
  mae: number; rmse: number; mape: number; r2: number;
  medae: number; bias: number; max_error: number; evs: number;
}
export interface HousingModel {
  name: string;
  is_best: boolean;
  metrics: HousingModelMetrics;
  predictions: number[];
  diagnostics: { rmse_over_mae: number; mae_over_medae: number; abs_bias: number };
  cv?: { r2_mean: number; r2_std: number; mae_mean: number; mae_std: number };
}
export interface HousingReport {
  meta: {
    task: string; title: string; subtitle: string; dataset: string;
    target: string; target_unit: string; features: string[];
    n_samples: number; n_features: number; n_test: number; n_points_in_json: number;
    target_stats: Record<string, number>;
    narrative: { context: string; hero_metric: string; main_conclusion: string };
  };
  headline: { best_model: string; best_metric: string; best_metric_value: number; verdict: string };
  data: {
    y_test: number[];
    feature_names: string[];
    feature_stats: Record<string, HousingFeatureStats>;
  };
  calculator: { model: string; intercept: number; coefficients: Record<string, number> };
  models: HousingModel[];
  by_metric: Record<string, string>;
  residual_diagnostics: {
    bias: number; median_residual: number; std_residual: number;
    skew: number; kurtosis: number; pct_beyond_2mae: number;
  };
  feature_importance: Record<string, { name: string; value: number }[]>;
  sample_predictions: Array<{
    features: Record<string, number>;
    actual: number; predicted: number; error: number; abs_error: number; within_mae: boolean;
  }>;
  charts: Record<string, string>;
}

export function useHousingReport() {
  return useJson<HousingReport>("regression/housing/report.json");
}

/** Предсказание по сырым коэффициентам Ridge (в единицах $100k) */
export function predictHousing(
  values: Record<string, number>,
  calc: HousingReport["calculator"]
): number {
  let sum = calc.intercept;
  for (const [f, c] of Object.entries(calc.coefficients)) {
    sum += c * (values[f] ?? 0);
  }
  return sum;
}

/** Человекочитаемые подписи для слайдеров */
export const HOUSING_LABELS: Record<string, string> = {
  MedInc:     "Медианный доход ($10k)",
  HouseAge:   "Возраст дома (лет)",
  AveRooms:   "Среднее число комнат",
  AveBedrms:  "Среднее число спален",
  Population: "Население округа",
  AveOccup:   "Жителей на дом",
  Latitude:   "Широта",
  Longitude:  "Долгота",
};