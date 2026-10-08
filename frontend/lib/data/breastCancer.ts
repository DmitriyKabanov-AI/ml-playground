// Загрузка реальных артефактов из public/artifacts/classification/{task}/report.json
// Никакого мока: всё, что видит фронт, приходит из артефактов ноутбука.

export interface BCModel {
  name: string;
  model: string;
  threshold: number;
  is_best: boolean;
  is_deployed?: boolean;
  /** sanitize превращает NaN/Infinity в null — тип это учитывает */
  metrics: Record<string, number | null>;
  per_class: Record<
    string,
    { precision: number; recall: number; f1: number; support: number }
  >;
  confusion_matrix: number[][];
  confusion_counts?: Record<string, number>;
  feature_importance?: { name: string; value: number }[];
  roc_auc?: number | null;
  pr_auc?: number | null;
}

export interface BCSweep {
  model: string;
  optimal_threshold: number;
  sweep_source?: string;
  thresholds: number[];
  precision_pos: number[];
  recall_pos: number[];
  "f0.5_pos"?: number[];
  f1_pos?: number[];
  f2_pos?: number[];
  specificity: number[];
  sensitivity: number[];
}

export interface BCSample {
  features: Record<string, number>;
  true: string;
  predicted: string;
  correct: boolean;
  error_type: string;
  confidence: number;
  proba: Record<string, number>;
}

export interface BCReport {
  meta: {
    task: string;
    title: string;
    subtitle: string;
    dataset: string;
    classes: string[];
    features: string[];
    n_samples: number;
    n_features: number;
    n_train: number;
    n_val?: number;
    n_test: number;
    target_stats: {
      class_distribution: Record<string, number>;
      class_distribution_test: Record<string, number>;
      imbalance_ratio: number;
      prevalence_positive: number;
      positive_class: string;
    };
    narrative: {
      context: string;
      hero_metric: string;
      why_not_accuracy?: string;
      why_f2?: string;
      contrast_with_breast_cancer_fp?: string;
      main_conclusion: string;
    };
  };
  headline: {
    best_model: string;
    best_metric: string;
    best_metric_value: number;
    verdict: string;
    diagnostic_verdict: Record<string, unknown>;
  };
  models: BCModel[];
  baseline?: { name: string; metrics: Record<string, number | null> };
  /** Sweep только для модели-лидера (обычно LogReg) */
  threshold_sweep?: BCSweep;
  /** Per-model sweep: ключи — имена моделей ("LogReg", "RandomForest", "GradientBoosting") */
  threshold_sweeps?: Record<string, BCSweep>;
  sample_predictions?: BCSample[];
  charts?: Record<string, string>;
}

export type BCTask = "breast_cancer_fp" | "breast_cancer_fn";

function sanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "number") return (Number.isFinite(obj) ? obj : (null as unknown as T));
  if (Array.isArray(obj)) return obj.map(sanitize) as unknown as T;
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      out[k] = sanitize((obj as Record<string, unknown>)[k]);
    }
    return out as unknown as T;
  }
  return obj;
}

export async function loadBCReport(task: BCTask): Promise<BCReport> {
  const res = await fetch(`/artifacts/classification/${task}/report.json`, {
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Не удалось загрузить ${task}/report.json (${res.status})`);
  const txt = await res.text();
  let raw: unknown;
  try {
    raw = JSON.parse(txt);
  } catch {
    const cleaned = txt
      .replace(/\bNaN\b/g, "null")
      .replace(/\b-?Infinity\b/g, "null");
    raw = JSON.parse(cleaned);
  }
  return sanitize(raw) as BCReport;
}

export function findBestModel(report: BCReport): BCModel {
  return report.models.find((m) => m.is_best) ?? report.models[0];
}

function at<T>(arr: T[] | undefined | null, idx: number, fallback: T): T {
  if (!Array.isArray(arr) || idx < 0 || idx >= arr.length) return fallback;
  const v = arr[idx];
  return v === null || v === undefined ? fallback : v;
}

export function sweepAt(sweep: BCSweep | undefined, t: number) {
  if (!sweep?.thresholds?.length) {
    return {
      threshold: 0,
      precision: 0,
      recall: 0,
      f05: 0,
      f1: 0,
      f2: 0,
      specificity: 1,
      sensitivity: 0,
    };
  }

  let idx = 0;
  let best = Infinity;
  for (let i = 0; i < sweep.thresholds.length; i++) {
    const d = Math.abs((sweep.thresholds[i] ?? 0) - t);
    if (d < best) {
      best = d;
      idx = i;
    }
  }

  return {
    threshold: at(sweep.thresholds, idx, 0),
    precision: at(sweep.precision_pos, idx, 0),
    recall: at(sweep.recall_pos, idx, 0),
    f05: at(sweep["f0.5_pos"], idx, 0),
    f1: at(sweep.f1_pos, idx, 0),
    f2: at(sweep.f2_pos, idx, 0),
    specificity: at(sweep.specificity, idx, 1),
    sensitivity: at(sweep.sensitivity, idx, 0),
  };
}

/**
 * Считает tp/fn/fp/tn для заданного порога.
 * Если передан sweepOverride — берёт кривые из него, иначе из report.threshold_sweep.
 */
export function countsFromSweep(
  report: BCReport,
  t: number,
  sweepOverride?: BCSweep
) {
  const s = sweepAt(sweepOverride ?? report.threshold_sweep, t);

  const dist = report.meta?.target_stats?.class_distribution_test ?? {};
  const positiveClass = report.meta?.target_stats?.positive_class ?? "malignant";
  const nTest =
    report.meta?.n_test ??
    Object.values(dist).reduce<number>((acc, v) => acc + (Number(v) || 0), 0);

  const nPosRaw =
    dist[positiveClass] ??
    Math.round((report.meta?.target_stats?.prevalence_positive ?? 0) * nTest);
  const nPos = Number.isFinite(nPosRaw) ? nPosRaw : 0;
  const nNeg = Math.max(0, nTest - nPos);

  const recall = Number.isFinite(s.recall) ? s.recall : 0;
  const spec = Number.isFinite(s.specificity) ? s.specificity : 1;

  const tp = Math.round(recall * nPos);
  const fn = Math.max(0, nPos - tp);

  const tn = Math.round(spec * nNeg);
  const fp = Math.max(0, nNeg - tn);

  return {
    tp,
    fn,
    fp,
    tn,
    ...s,
    recall,
    specificity: spec,
  };
}