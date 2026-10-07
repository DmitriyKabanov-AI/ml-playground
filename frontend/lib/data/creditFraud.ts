// Загрузка реального артефакта credit_fraud/report.json

export interface CFModel {
  name: string;
  threshold: number;
  is_best: boolean;
  is_naive: boolean;
  metrics: Record<string, number>;
  per_class: Record<string, { precision: number; recall: number; f1: number; support: number }>;
  confusion_matrix: number[][];
  confusion_counts: {
    tp_fraud: number;
    fn_fraud: number;
    fp_normal: number;
    tn_normal: number;
  };
  roc_auc: number;
  pr_auc: number;
  mean_confidence?: number | null;
  median_confidence?: number | null;
  feature_importance?: { name: string; value: number }[];
}

export interface CFSample {
  features: Record<string, number>;
  true: string;
  predicted: string;
  correct: boolean;
  error_type: string;
  confidence: number;
  proba: Record<string, number>;
}

export interface CFReport {
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
      class_distribution_test: Record<string, number>;
      is_balanced: boolean;
      imbalance_ratio: number;
      positive_label: number;
      positive_class: string;
      prevalence_positive: number;
      prevalence_test: number;
    };
    narrative: {
      context: string;
      hero_metric: string;
      why_mcc?: string;
      why_not_accuracy?: string;
      why_not_roc_auc?: string;
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
  models: CFModel[];
  by_metric: Record<string, string>;
  error_by_class: Record<string, { support: number; error_rate: number; accuracy: number }>;
  sample_predictions: CFSample[];
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

export async function loadCreditFraudReport(): Promise<CFReport> {
  const res = await fetch("/artifacts/classification/credit_fraud/report.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Не удалось загрузить credit_fraud/report.json (${res.status})`);
  const txt = await res.text();
  let raw: any;
  try {
    raw = JSON.parse(txt);
  } catch {
    const cleaned = txt.replace(/\bNaN\b/g, "null").replace(/\b-?Infinity\b/g, "null");
    raw = JSON.parse(cleaned);
  }
  return sanitize(raw) as CFReport;
}

export function findBestCFModel(report: CFReport): CFModel {
  return report.models.find((m) => m.is_best) ?? report.models[0];
}