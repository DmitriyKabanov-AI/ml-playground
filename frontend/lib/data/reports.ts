"use client";
import { useEffect, useState } from "react";

/* ============================================================
 * Типы и загрузчик отчётов, которые пишут ноутбуки 02–04
 * (artifacts/classification/<slug>/report.json)
 * ============================================================ */

export const REPORT_SLUGS = {
  flights: "flight_delays",
  intrusion: "network_intrusion",
  accidents: "accident_severity",
} as const;

export interface SparkBlock {
  mode: "cluster" | "local";
  master: string;
  spark_version: string;
  app_id: string;
  cores: number;
  executor_memory: string;
  default_parallelism: number;
  shuffle_partitions: number;
  shared_dir: string;
  data_fraction: number;
  n_rows_raw: number;
  n_rows_used: number;
  tree_train_rows?: number;
  timings: Record<string, number>;
  ui?: { master: string; history: string };
}

export interface Sweep {
  thresholds: number[];
  tp: number[];
  fp: number[];
  fn: number[];
  tn: number[];
}

export interface Counts {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export interface BinaryMetricsBlock {
  accuracy: number;
  balanced_accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  f1_weighted: number;
  "f0.5_macro": number;
  f2_macro: number;
  mcc: number;
  kappa: number;
  specificity: number;
  sensitivity: number;
  precision_pos: number;
  recall_pos: number;
  f1_pos: number;
  "f0.5_pos": number;
  f2_pos: number;
  roc_auc: number;
  pr_auc: number;
}

export interface FeatureImp {
  name: string;
  value: number;
}

export interface Curves {
  roc: { fpr: number[]; tpr: number[] };
  pr: { recall: number[]; precision: number[] };
}

export interface FamilyRow {
  family: string;
  n: number;
  flagged: number;
  rate: number;
  is_rare: boolean;
}

export interface BinaryModel {
  name: string;
  model: string;
  note?: string | null;
  is_baseline: boolean;
  is_best: boolean;
  threshold: number;
  metrics: BinaryMetricsBlock;
  roc_auc: number;
  pr_auc: number;
  confusion_counts: Counts;
  cost_per_1000?: number;
  fixed_05: Omit<BinaryMetricsBlock, "roc_auc" | "pr_auc">;
  sweep: Sweep;
  curves: Curves;
  feature_importance: FeatureImp[];
  by_family?: FamilyRow[];
  train_seconds?: number | null;
}

export interface BinaryMetaBase {
  task: string;
  title: string;
  subtitle: string;
  dataset: string;
  target: string;
  classes: string[];
  positive_class: string;
  features: string[];
  generated_at: string;
  n_samples_raw: number;
  n_samples: number;
  n_features: number;
  n_train: number;
  n_val: number;
  n_test: number;
  split_note: string;
  spark: SparkBlock;
  target_stats: {
    prevalence: number;
    prevalence_by_fold: Record<string, number>;
    imbalance_ratio: number;
    prevalence_test?: number;
    n_positive?: number;
  };
  narrative: Record<string, unknown> & {
    context: string;
    hero_metric: string;
    why_hero: string;
    why_not_accuracy?: string;
    main_conclusion: string;
    rules: Record<string, string>;
  };
}

export interface BinaryReport<Meta = {}, Eda = {}> {
  meta: BinaryMetaBase & Meta;
  headline: {
    best_model: string;
    best_metric: string;
    best_metric_value: number;
    verdict: string;
    diagnostic_verdict: Record<string, number | boolean | string>;
  };
  models: BinaryModel[];
  eda: Eda;
  charts: Record<string, string>;
  artifacts: Record<string, string | null>;
}

/* ---------- Flight Delays ---------- */
export type FlightsReport = BinaryReport<
  { costs: { fp: number; fn: number; unit: string } },
  {
    by_hour: { dep_hour: number; n: number; rate: number }[];
    by_month: { month: number; n: number; rate: number }[];
    by_dow: { dow: number; n: number; rate: number }[];
    by_airline: { code: string; name: string; n: number; rate: number }[];
  }
>;

/* ---------- Network Intrusion ---------- */
export type IntrusionReport = BinaryReport<
  { imbalance: { w_pos: number; under_ratio: number; train_under_rows: number } },
  {
    families: { family: string; n: number; is_rare: boolean }[];
    folds: Record<string, { n: number; pos: number; prevalence: number }>;
  }
>;

/* ---------- US Accidents (multiclass) ---------- */
export interface MulticlassMetrics {
  accuracy: number;
  balanced_accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
  mcc: number;
  kappa: number;
  qwk: number;
  top2_accuracy?: number;
}

export interface PerClass {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface MulticlassModel {
  name: string;
  model: string;
  note?: string | null;
  is_baseline: boolean;
  is_best: boolean;
  alpha?: number | null;
  metrics: MulticlassMetrics;
  per_class: Record<string, PerClass>;
  confusion_matrix: number[][];
  feature_importance: FeatureImp[];
  train_seconds?: number | null;
}

export interface AccidentSample {
  lat: number;
  lng: number;
  hour: number;
  state: string;
  temperature_f: number | null;
  visibility_mi: number | null;
  true: string;
  predicted: string;
  correct: boolean;
  proba: Record<string, number>;
}

export interface AccidentsReport {
  meta: Omit<BinaryMetaBase, "classes" | "positive_class" | "target_stats"> & {
    classes: string[];
    class_descriptions: Record<string, string>;
    rare_classes: string[];
    n_classes: number;
    target_stats: {
      class_distribution: Record<string, number>;
      imbalance_ratio: number;
      priors: Record<string, number>;
      class_weights: Record<string, number>;
    };
  };
  headline: BinaryReport["headline"];
  models: MulticlassModel[];
  eda: {
    class_distribution: { class: string; n: number; share: number; desc: string }[];
    by_hour: { hour: number; n: number; s34: number }[];
    by_state: { state: string; n: number; s34: number }[];
    by_year: ({ year: number; n: number } & Record<string, number>)[];
  };
  sample_predictions: AccidentSample[];
  charts: Record<string, string>;
  artifacts: Record<string, string | null>;
}

/* ============================================================
 * Загрузка
 * ============================================================ */
export async function loadReport<T>(slug: string): Promise<T> {
  const res = await fetch(`/artifacts/classification/${slug}/report.json`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status}: нет artifacts/classification/${slug}/report.json — выполните соответствующий ноутбук`
    );
  }
  return (await res.json()) as T;
}

export function useReport<T>(slug: string): { report: T | null; error: string | null } {
  const [report, setReport] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadReport<T>(slug)
      .then((r) => alive && setReport(r))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [slug]);
  return { report, error };
}

/* ============================================================
 * Математика порогов: счётчики → метрики → цена
 * ============================================================ */
export function nearestIdx(sweep: Sweep, t: number): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < sweep.thresholds.length; i++) {
    const d = Math.abs(sweep.thresholds[i] - t);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

export function countsAtIdx(sweep: Sweep, i: number): Counts {
  return { tp: sweep.tp[i], fp: sweep.fp[i], fn: sweep.fn[i], tn: sweep.tn[i] };
}

export function countsAt(sweep: Sweep, t: number): Counts {
  return countsAtIdx(sweep, nearestIdx(sweep, t));
}

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

export function derive(c: Counts) {
  const n = c.tp + c.fp + c.fn + c.tn;
  const precision = div(c.tp, c.tp + c.fp);
  const recall = div(c.tp, c.tp + c.fn);
  const fb = (b: number) => {
    const d = b * b * precision + recall;
    return d > 0 ? ((1 + b * b) * precision * recall) / d : 0;
  };
  const den = Math.sqrt((c.tp + c.fp) * (c.tp + c.fn) * (c.tn + c.fp) * (c.tn + c.fn));
  return {
    n,
    precision,
    recall,
    specificity: div(c.tn, c.tn + c.fp),
    fpr: div(c.fp, c.fp + c.tn),
    accuracy: div(c.tp + c.tn, n),
    f1: fb(1),
    f2: fb(2),
    f05: fb(0.5),
    mcc: den > 0 ? (c.tp * c.tn - c.fp * c.fn) / den : 0,
  };
}

export const costPer1000 = (c: Counts, cfp: number, cfn: number) => {
  const n = c.tp + c.fp + c.fn + c.tn;
  return n > 0 ? ((c.fp * cfp + c.fn * cfn) / n) * 1000 : 0;
};

export function bestCostIdx(sweep: Sweep, cfp: number, cfn: number): number {
  let bi = 0;
  let bv = Infinity;
  for (let i = 0; i < sweep.thresholds.length; i++) {
    const v = sweep.fp[i] * cfp + sweep.fn[i] * cfn;
    if (v < bv) {
      bv = v;
      bi = i;
    }
  }
  return bi;
}

/* ---------- форматтеры ---------- */
export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export const fmtPct = (v?: number | null, d = 1) => (isNum(v) ? `${(v * 100).toFixed(d)}%` : "—");
export const fmtNum = (v?: number | null, d = 3) => (isNum(v) ? v.toFixed(d) : "—");
export const fmtInt = (v?: number | null) => (isNum(v) ? Math.round(v).toLocaleString("ru-RU") : "—");
export function fmtCompact(v?: number | null): string {
  if (!isNum(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)} млрд`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)} млн`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)} тыс`;
  return String(Math.round(v));
}
export function fmtSeconds(s?: number | null): string {
  if (!isNum(s)) return "—";
  if (s < 90) return `${s.toFixed(0)} с`;
  const m = Math.floor(s / 60);
  return `${m} мин ${Math.round(s - m * 60)} с`;
}
