/** Контракты данных. Ровно эти JSON-структуры ожидает API (см. раздел «Подключение данных»). */
export interface IrisDataset {
  featureNames: string[];
  classNames: string[];
  X: number[][];
  y: number[];
}

export interface RegressionDataset {
  featureNames: string[];
  target: string;
  X: number[][];
  y: number[];
}

export interface WalmartRow {
  date: string; // YYYY-MM-DD, еженедельно
  sales: number;
  holiday: string | null; // 'Super Bowl' | 'Labor Day' | 'Thanksgiving' | 'Christmas' | null
}
export interface WalmartStore {
  id: number;
  name: string;
  rows: WalmartRow[];
}
export interface WalmartDataset {
  stores: WalmartStore[];
}

export interface WeatherVariable {
  key: string;
  label: string;
  unit: string;
  decimals: number;
}
export interface WeatherCity {
  name: string;
  startDate: string; // дата первого дня; ряды ежедневные
  series: Record<string, number[]>;
}
export interface WeatherDataset {
  variables: WeatherVariable[];
  cities: WeatherCity[];
}
/* ---------- Контракты реального API ---------- */

export interface TaskSummary {
  task: string;
  n_models: number;
  n_active: number;
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

export interface TaskMetrics {
  task: string;
  category: 'classification' | 'regression' | 'forecasting';
  active: ActiveModel;
  all_models: ModelRow[];
}

export type Category = TaskMetrics['category'];