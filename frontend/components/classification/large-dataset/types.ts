export type Task = "flight_delay" | "taxi_payment" | "cover_type";

export type MetricValue = number | null | undefined;
export type MetricMap = Record<string, MetricValue>;

export type ClassMetric = {
  precision?: MetricValue;
  recall?: MetricValue;
  f1?: MetricValue;
  support?: number;
  is_rare?: boolean;
};

export type ModelResult = {
  name: string;
  is_best?: boolean;
  is_naive?: boolean;
  train_rows?: number;
  model_path?: string;
  metrics: MetricMap;
  confusion_matrix: number[][];
  per_class?: Record<string, ClassMetric>;
  per_class_recall?: Record<string, number>;
};

export type DatasetReport = {
  meta: {
    id?: string;
    title: string;
    subtitle: string;
    description?: string;
    source?: string;
    source_url?: string;
    generated_at?: string;
    hero_metric?: string;
    target_name?: string;
    classes: string[];
    dataset_stats: {
      n_samples: number;
      n_features: number;
      n_classes: number;
      n_train: number;
      n_test: number;
    };
    target_stats: {
      class_distribution: Record<string, number>;
      rare_class: string | null;
      imbalance_ratio: number;
      rare_class_ratio: number;
    };
  };
  models: ModelResult[];
};

export const DATASET_PATHS: Record<Task, string> = {
  flight_delay: "/artifacts/classification/flight_delay/report.json",
  taxi_payment: "/artifacts/classification/taxi_payment/report.json",
  cover_type: "/artifacts/classification/cover_type/report.json",
};

export const fmt = (value?: MetricValue, digits = 3) =>
  value === undefined || value === null || !Number.isFinite(value) ? "—" : value.toFixed(digits);

export const fmtPct = (value?: MetricValue, digits = 1) =>
  value === undefined || value === null || !Number.isFinite(value)
    ? "—"
    : `${(value * 100).toFixed(digits)}%`;

export const fmtInt = (value?: number | null) =>
  value === undefined || value === null || !Number.isFinite(value)
    ? "—"
    : Math.round(value).toLocaleString("ru-RU");

export const metric = (model: ModelResult, key: string): number | null => {
  const value = model.metrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export const classMetric = (
  model: ModelResult,
  label: string,
  key: "precision" | "recall" | "f1" | "support",
): number | null => {
  const found = model.per_class?.[label]?.[key];
  if (typeof found === "number" && Number.isFinite(found)) return found;
  if (key === "recall") {
    const fallback = model.per_class_recall?.[label];
    if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
  }
  return null;
};

export const sum = (values: number[]) => values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

export function getClassDistribution(report: DatasetReport) {
  const source = report.meta.target_stats?.class_distribution ?? {};
  const sourceTotal = sum(Object.values(source));
  return report.meta.classes.map((label, index) => {
    const count = Number(source[label] ?? 0);
    const supportFallback = report.models[0]?.confusion_matrix?.[index]?.reduce((a, b) => a + b, 0) ?? 0;
    const actualCount = count > 0 ? count : supportFallback;
    const total = sourceTotal > 0 ? sourceTotal : report.meta.dataset_stats?.n_samples || 1;
    return { label, count: actualCount, share: actualCount / total, index, rare: label === report.meta.target_stats?.rare_class };
  });
}

export function getPositiveClassIndex(report: DatasetReport) {
  const found = report.meta.classes.findIndex((label) => /delayed|delay.*15|15.*min/i.test(label));
  return found >= 0 ? found : Math.max(0, report.meta.classes.length - 1);
}

export function getMatrixStats(matrix: number[][], positiveIndex = 1) {
  const n = matrix.length;
  const safe = (i: number, j: number) => Number(matrix[i]?.[j] ?? 0);
  const rowTotal = (i: number) => sum(matrix[i] ?? []);
  const colTotal = (j: number) => sum(matrix.map((row) => Number(row[j] ?? 0)));
  const tp = safe(positiveIndex, positiveIndex);
  const fn = Math.max(0, rowTotal(positiveIndex) - tp);
  const fp = Math.max(0, colTotal(positiveIndex) - tp);
  const tn = n === 2 ? safe(1 - positiveIndex, 1 - positiveIndex) : 0;
  return { tp, fn, fp, tn, positiveSupport: rowTotal(positiveIndex), predictedPositive: colTotal(positiveIndex), total: sum(matrix.flat()) };
}

export function getLargestConfusion(report: DatasetReport, model: ModelResult) {
  const matrix = model.confusion_matrix ?? [];
  let result: { actual: string; predicted: string; count: number } | null = null;
  matrix.forEach((row, i) => row.forEach((count, j) => {
    if (i !== j && count > 0 && (!result || count > result.count)) {
      result = { actual: report.meta.classes[i] ?? `Class ${i}`, predicted: report.meta.classes[j] ?? `Class ${j}`, count };
    }
  }));
  return result;
}
