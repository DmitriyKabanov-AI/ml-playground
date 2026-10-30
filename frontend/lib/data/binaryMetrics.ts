/**
 * Метрики бинарной классификации для дашборда Flight Delays.
 *
 * Модуль самодостаточный: из `@/lib/data/reports` берётся только ТИП BinaryModel,
 * все новые поля report.json (ap, brier, calibration, val_best) читаются через
 * безопасные геттеры — старый report.json без этих полей не ломает страницу.
 */
import type { BinaryModel } from "@/lib/data/reports";

export type Cnt = { tp: number; fp: number; fn: number; tn: number };

/* ------------------------------------------------------------------ */
/*  базовые функции                                                    */
/* ------------------------------------------------------------------ */
export const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** a / b, а при b = 0 — NaN (в интерфейсе показывается как «—»). */
const ratio = (a: number, b: number) => (b > 0 ? a / b : NaN);

/** F-beta; если precision/recall не определены или знаменатель 0 — 0 (как sklearn zero_division=0). */
export function fbeta(p: number, r: number, beta: number): number {
  const pp = finite(p) ? p : 0;
  const rr = finite(r) ? r : 0;
  const b2 = beta * beta;
  const d = b2 * pp + rr;
  return d > 0 ? ((1 + b2) * pp * rr) / d : 0;
}

export type FullMetrics = {
  n: number;
  /** Sensitivity = Recall = TPR */
  sensitivity: number;
  /** Specificity = TNR */
  specificity: number;
  /** Precision = PPV */
  precision: number;
  /** NPV */
  npv: number;
  mcc: number;
  accuracy: number;
  fpr: number;
  /** положительный класс («задержка») */
  f05: number;
  f1: number;
  f2: number;
  /** отрицательный класс («вовремя») как целевой: precision = NPV, recall = Specificity */
  f05Neg: number;
  f1Neg: number;
  f2Neg: number;
};

export function fullMetrics(c: Cnt): FullMetrics {
  const { tp, fp, fn, tn } = c;
  const P = tp + fn;
  const N = tn + fp;
  const n = P + N;
  const sensitivity = ratio(tp, P);
  const specificity = ratio(tn, N);
  const precision = ratio(tp, tp + fp);
  const npv = ratio(tn, tn + fn);
  const den = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  const mcc = den > 0 ? (tp * tn - fp * fn) / den : 0;
  return {
    n,
    sensitivity,
    specificity,
    precision,
    npv,
    mcc,
    accuracy: ratio(tp + tn, n),
    fpr: ratio(fp, N),
    f05: fbeta(precision, sensitivity, 0.5),
    f1: fbeta(precision, sensitivity, 1),
    f2: fbeta(precision, sensitivity, 2),
    f05Neg: fbeta(npv, specificity, 0.5),
    f1Neg: fbeta(npv, specificity, 1),
    f2Neg: fbeta(npv, specificity, 2),
  };
}

/* ------------------------------------------------------------------ */
/*  сетка порогов: F0.5 / F2 для обоих сценариев                        */
/* ------------------------------------------------------------------ */
export type FKey = "f05" | "f2" | "f05Neg" | "f2Neg";

export type SweepRow = {
  t: number;
  f05: number;
  f2: number;
  f05Neg: number;
  f2Neg: number;
};

export function sweepRows(model: BinaryModel): SweepRow[] {
  const sw = model.sweep;
  return sw.thresholds.map((t, i) => {
    const m = fullMetrics({ tp: sw.tp[i], fp: sw.fp[i], fn: sw.fn[i], tn: sw.tn[i] });
    return { t, f05: m.f05, f2: m.f2, f05Neg: m.f05Neg, f2Neg: m.f2Neg };
  });
}

/** Индекс максимума (при равенстве — наименьший порог). */
export function bestIdx(rows: SweepRow[], key: FKey): number {
  let best = 0;
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i][key] > rows[best][key] + 1e-12) best = i;
  }
  return best;
}

/* ------------------------------------------------------------------ */
/*  новые поля report.json                                             */
/* ------------------------------------------------------------------ */
export type Calibration = {
  mean_pred: number[];
  obs_rate: number[];
  n: number[];
  ece?: number | null;
};

type FBest = { threshold?: number | null; val_score?: number | null };
export type ValBest = Partial<Record<"f05_pos" | "f2_pos" | "f05_neg" | "f2_neg", FBest>>;

type Extras = {
  ap?: number | null;
  brier?: number | null;
  calibration?: Calibration | null;
  val_best?: ValBest | null;
  metrics?: Record<string, number | null | undefined>;
  curves?: { pr?: { recall: number[]; precision: number[] } };
  pr_auc?: number;
};

const ex = (m: BinaryModel) => m as unknown as Extras;

/** Ступенчатая AP по PR-кривой: Σ (R_n − R_{n−1}) · P_n (как в sklearn). recall — по возрастанию. */
export function apFromCurve(recall: number[], precision: number[]): number {
  let s = 0;
  let prev = 0;
  for (let i = 0; i < recall.length; i += 1) {
    const r = recall[i];
    const p = precision[i];
    if (finite(r) && finite(p)) {
      s += Math.max(0, r - prev) * p;
      prev = Math.max(prev, r);
    }
  }
  return s;
}

/** AP модели: точное значение из ноутбука, иначе пересчёт по сохранённой PR-кривой. */
export function getAp(m: BinaryModel): number {
  const e = ex(m);
  const stored = e.ap ?? e.metrics?.ap;
  if (finite(stored)) return stored;
  const pr = e.curves?.pr;
  if (pr?.recall?.length) return apFromCurve(pr.recall, pr.precision);
  return finite(e.pr_auc) ? e.pr_auc : NaN;
}

export function getBrier(m: BinaryModel): number {
  const e = ex(m);
  const v = e.brier ?? e.metrics?.brier;
  return finite(v) ? v : NaN;
}

export const getCalibration = (m: BinaryModel): Calibration | null => ex(m).calibration ?? null;
export const getValBest = (m: BinaryModel): ValBest | null => ex(m).val_best ?? null;

/** Brier «ничего не знающего» предиктора, всегда выдающего prevalence: p(1−p). */
export const brierNoSkill = (prevalence: number) => prevalence * (1 - prevalence);

/** Brier Skill Score = 1 − Brier / Brier_ref (>0 — лучше константы prevalence). */
export const brierSkill = (brier: number, prevalence: number) => {
  const ref = brierNoSkill(prevalence);
  return finite(brier) && ref > 0 ? 1 - brier / ref : NaN;
};

/**
 * Ступенчатая PR-кривая для графика: между соседними точками precision постоянна
 * и равна precision правой (с большим recall) точки — ровно так считается AP.
 */
export function stepPoints(recall: number[], precision: number[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < recall.length; i += 1) {
    if (i === 0) {
      out.push({ x: recall[0], y: precision[0] });
    } else {
      out.push({ x: recall[i - 1], y: precision[i] });
      out.push({ x: recall[i], y: precision[i] });
    }
  }
  return out;
}

/** Короткое имя для оси X. */
export const shortName = (name: string) => name.replace("Baseline · всегда ", "base · ").replace("Baseline · ", "base · ");

/**
 * Согласованное разбиение на 1000 рейсов: задержка + вовремя ровно 1000 штук и ровно 100.0 %.
 * Процент и штуки считаются из одного округлённого значения, поэтому не расходятся.
 */
export function splitPer1000(prevalence: number) {
  const late = Math.min(1000, Math.max(0, Math.round(prevalence * 1000)));
  const onTime = 1000 - late;
  return { late, onTime, latePct: late / 10, onTimePct: onTime / 10 };
}
