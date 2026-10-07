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
  return rows.map((r) => {
    const n = (k: string) => Number(r[k] ?? 0);
    const threshold = n("threshold") || n("thr") || n("t");
    const precision = n("precision");
    const recall = n("recall");
    const f1 = n("f1") || n("f1_score");
    const f05 = n("f05") || n("f0_5") || n("f0.5") || f1;
    const f2 = n("f2") || f1;
    const mcc = n("mcc");
    const tp = n("tp");
    const fp = n("fp");
    const fn = n("fn");
    const tn = n("tn");
    return { threshold, precision, recall, f1, f05, f2, mcc, fp, fn, tp, tn };
  }).sort((a, b) => a.threshold - b.threshold);
}
