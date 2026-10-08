// Загрузка реального артефакта digits_imbalanced/report.json

export interface DigitsModel {
  name: string;
  is_best: boolean;
  /** baseline-модель (DummyClassifier) — на фронте рисуем бейдж «baseline». */
  is_naive?: boolean;
  metrics: Record<string, number>;
  per_class: Record<string, {
    precision: number;
    recall: number;
    f1: number;
    support: number;
    is_rare: boolean;
  }>;
  per_class_recall: Record<string, number>;
  confusion_matrix: number[][];
  rare_class_recall: number;
  weighted_minus_macro_gap: number;
  /** top-15 feature importance для деревьев и LogReg; у baseline нет. */
  feature_importance?: { name: string; value: number }[];
}

export interface DigitsSample {
  index: number;
  features: Record<string, number>;
  true: string;
  predicted: string;
  correct: boolean;
  is_rare_true: boolean;
  confidence: number;
  top3: { class: string; proba: number }[];
}

export interface DigitsReport {
  meta: {
    task: string;
    title: string;
    subtitle: string;
    dataset: string;
    classes: string[];
    features: string[];
    seed: number;
    n_samples: number;
    n_features: number;
    n_classes: number;
    n_train: number;
    n_test: number;
    target_stats: {
      class_distribution: Record<string, number>;
      class_distribution_train: Record<string, number>;
      class_distribution_test: Record<string, number>;
      is_balanced: boolean;
      imbalance_ratio: number;
      rare_class: string;
      rare_class_support: number;
      rare_class_support_train: number;
      rare_class_support_test: number;
      rare_class_ratio: number;
    };
    narrative: {
      context: string;
      hero_metric: string;
      why_macro_f1?: string;
      why_not_weighted?: string;
      main_conclusion: string;
      rules?: Record<string, string>;
    };
  };
  headline: {
    best_model: string;
    best_metric: string;
    best_metric_value: number;
    verdict: string;
    diagnostic_verdict: Record<string, any>;
  };
  models: DigitsModel[];
  by_metric: Record<string, string>;
  per_class_recall: { class: string; recall: number; support: number; is_rare: boolean }[];
  error_by_class: Record<string, { support: number; error_rate: number; accuracy: number }>;
  sample_predictions: DigitsSample[];
  charts?: Record<string, string>;
}

function sanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "number") return (Number.isFinite(obj) ? obj : (null as any));
  if (Array.isArray(obj)) return obj.map(sanitize) as any;
  if (typeof obj === "object") {
    const out: any = {};
    for (const k of Object.keys(obj as any)) out[k] = sanitize((obj as any)[k]);
    return out;
  }
  return obj;
}

export async function loadDigitsReport(): Promise<DigitsReport> {
  const res = await fetch("/artifacts/classification/digits_imbalanced/report.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Не удалось загрузить digits_imbalanced/report.json (${res.status})`);
  const txt = await res.text();
  let raw: any;
  try {
    raw = JSON.parse(txt);
  } catch {
    const cleaned = txt.replace(/\bNaN\b/g, "null").replace(/\b-?Infinity\b/g, "null");
    raw = JSON.parse(cleaned);
  }
  return sanitize(raw) as DigitsReport;
}

export function findBestDigitsModel(report: DigitsReport): DigitsModel {
  return report.models.find((m) => m.is_best) ?? report.models[0];
}

// Разворачиваем pix_0..pix_63 в 8×8 матрицу
export function pixelsFromSample(features: Record<string, number>): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < 8; r++) {
    const row: number[] = [];
    for (let c = 0; c < 8; c++) row.push(features[`pix_${r * 8 + c}`] ?? 0);
    grid.push(row);
  }
  return grid;
}