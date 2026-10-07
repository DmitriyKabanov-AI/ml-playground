import { MetricsSet, ThresholdPoint } from "../types";

/** report.models[i].metrics → MetricsSet */
export function metricsFromModel(model: any): MetricsSet {
  if (!model?.metrics) return {};
  const m = model.metrics;
  return {
    accuracy: m.accuracy,
    balancedAccuracy: m.balanced_accuracy,
    precisionMacro: m.precision_macro,
    recallMacro: m.recall_macro,
    f1Macro: m.f1_macro,
    f1Weighted: m.f1_weighted,
    f05Macro: m["f0.5_macro"] ?? m.f05_macro ?? m.f0_5_macro,
    f2Macro: m.f2_macro,
    mcc: m.mcc,
    kappa: m.kappa,
    rocAuc: m.roc_auc_ovr_macro ?? m.roc_auc_ovr_weighted,
    prAuc: m.pr_auc_macro,
    top2Accuracy: m.top2_accuracy,
    top3Accuracy: m.top3_accuracy,
  };
}

/** report.models → [{ id, name, isBest }] */
export function modelsFromReport(report: any): { id: string; name: string; isBest: boolean }[] {
  if (!Array.isArray(report?.models)) return [];
  return report.models.map((m: any) => ({
    id: m.name,
    name: m.name,
    isBest: !!m.is_best,
  }));
}

/** threshold_sweep.csv → ThresholdPoint[] */
export function normalizeSweep(rows: Record<string, string>[]): ThresholdPoint[] {
  const pick = (row: Record<string, string>, ...keys: string[]): number | null => {
    for (const k of keys) {
      const raw = row[k];
      if (raw !== undefined && raw !== null && raw !== "") {
        const v = Number(raw);
        if (Number.isFinite(v)) return v;
      }
    }
    return null;
  };

  return rows.map((r) => {
    const threshold = pick(r, "threshold", "thr", "t") ?? 0;
    const precision = pick(r, "precision") ?? 0;
    const recall = pick(r, "recall") ?? 0;
    const f1 = pick(r, "f1", "f1_score") ?? 0;
    const f05 = pick(r, "f05", "f0_5", "f0.5") ?? f1;
    const f2 = pick(r, "f2") ?? f1;
    const mcc = pick(r, "mcc") ?? 0;
    const tp = pick(r, "tp") ?? 0;
    const fp = pick(r, "fp") ?? 0;
    const fn = pick(r, "fn") ?? 0;
    const tn = pick(r, "tn") ?? 0;
    return { threshold, precision, recall, f1, f05, f2, mcc, fp, fn, tp, tn };
  }).sort((a, b) => a.threshold - b.threshold);
}
