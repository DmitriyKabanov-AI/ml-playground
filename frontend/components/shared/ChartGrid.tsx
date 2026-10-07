"use client";
import { Card, CardTitle } from "@/components/ui/Card";

const TITLES: Record<string, string> = {
  eda: "EDA / распределения",
  confusion_matrix: "Confusion matrix",
  confusion_matrices: "Confusion matrices (все модели)",
  confusion_optimal: "Confusion matrix при оптимальном пороге",
  confusion_normalized: "Confusion matrix (нормированная)",
  roc_ovr: "ROC OvR",
  roc_pr: "ROC vs PR",
  roc_vs_pr: "ROC vs PR",
  threshold_sweep: "Threshold sweep",
  per_class_recall: "Recall по классам",
  class_balance: "Баланс классов",
  metrics_comparison: "Сравнение моделей",
  mae_by_station: "MAE по станциям",
  eda_overview: "EDA overview",
  eda_stations: "EDA по станциям",
  skill_by_station: "Skill по станциям",
};

export function ChartGrid({ charts, baseUrl }: { charts: Record<string, string>; baseUrl: string }) {
  if (!charts || !Object.keys(charts).length) return null;
  const entries = Object.entries(charts).filter(([, f]) => typeof f === "string" && f.endsWith(".png"));
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {entries.map(([key, file]) => (
        <Card key={key}>
          <CardTitle>{TITLES[key] ?? key}</CardTitle>
          <img
            src={`${baseUrl}${file}`}
            alt={key}
            className="mt-3 w-full rounded-xl"
            loading="lazy"
          />
        </Card>
      ))}
    </div>
  );
}
