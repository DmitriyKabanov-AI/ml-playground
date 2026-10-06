export type Category = 'classification' | 'regression' | 'forecasting'

export interface TaskSummary {
  task: string
  n_models: number
  n_active: number
}

export interface ModelRow {
  id: number
  name: string
  metrics: Record<string, number>
  status: 'active' | 'inactive'
}

export interface ActiveModel {
  id: number
  name: string
  metrics: Record<string, number>
  meta: Record<string, unknown>
}

export interface ClassificationModelRow {
  name: string
  acc: number
  f1: number
  precision?: number
  recall?: number
  balanced_acc?: number
}

export interface RocCurve {
  cls: string
  auc: number
  fpr: number[]
  tpr: number[]
}

export interface ImportanceItem {
  name: string
  value: number
}

export interface ClassificationPoint {
  f: number[]
  y: number
  p: number
  test: boolean
}

export interface ClassificationReport {
  classes: string[]
  features: string[]
  confusion: number[][]
  models: ClassificationModelRow[]
  roc: RocCurve[]
  importance: ImportanceItem[]
  cv: number[]
  points?: ClassificationPoint[]
}

export interface RegressionHeadline {
  best_model: string
  best_metric: string
  best_metric_value: number
  verdict: string
}

export interface ResidualDiagnostics {
  bias: number
  median_residual: number
  std_residual: number
  skew: number
  kurtosis: number
  pct_beyond_2mae: number
}

export interface SamplePrediction {
  y_true: number
  y_pred: number
}

export interface RegressionReport {
  meta: Record<string, unknown>
  headline: RegressionHeadline
  models: string[]
  by_metric: Record<string, Record<string, number>>
  residual_diagnostics: ResidualDiagnostics
  feature_importance: Record<string, ImportanceItem[]>
  sample_predictions?: SamplePrediction[]
  charts?: string[]
  artifacts?: string[]
}

export interface WeatherDiagnosticVerdict {
  skill_h1_ridge_mean: number
  skill_h14_ridge_mean: number
  skill_h1_rf_mean: number
  skill_h14_rf_mean: number
  skill_drops_with_horizon: boolean
  ml_beats_persistence_at_h1: boolean
  ml_loses_to_persistence_at_h14: boolean
}

export interface WeatherHeadline {
  best_station: number
  best_station_label: string
  best_model: string
  hero_metric: string
  hero_value: number
  verdict: string
  diagnostic_verdict: WeatherDiagnosticVerdict
}

export interface WeatherStation {
  station_id: number
  label?: string
  n_test: number
  best_model: string
  hero_value: number
  mean_skill: Record<string, number>
  mean_mae: Record<string, number>
  skill_h1: Record<string, number>
  skill_h14: Record<string, number>
  mae_h1: Record<string, number>
  mae_h14: Record<string, number>
  persistence_mae_h1: number
  seasonal_mae_h1: number
  zero_crossing: Record<string, number>
  mae_by_horizon: Record<string, Record<string, number>>
  skill_by_horizon: Record<string, Record<string, number>>
}

export interface WeatherHorizonStat {
  mae_ridge_mean: number
  mae_rf_mean: number
  skill_ridge_mean: number
  skill_rf_mean: number
  persistence_mae_mean: number
  seasonal_mae_mean: number
}

export interface WeatherReport {
  meta: Record<string, unknown>
  headline: WeatherHeadline
  stations: WeatherStation[]
  by_horizon: Record<string, WeatherHorizonStat>
  feature_importance?: Record<string, ImportanceItem[]>
  charts?: string[]
  artifacts?: string[]
}

export type TaskReport = ClassificationReport | RegressionReport | WeatherReport

export interface TaskMetrics {
  task: string
  category: Category
  active: ActiveModel
  all_models: ModelRow[]
  report?: TaskReport
}

export interface HealthResponse {
  status: string
  n_models: number
}