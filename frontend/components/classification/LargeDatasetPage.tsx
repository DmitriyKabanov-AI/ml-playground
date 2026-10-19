"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type MetricMap = Record<string, number | null | undefined>;
type ClassMetric = { precision: number; recall: number; f1: number; support: number; is_rare?: boolean };
type ModelResult = {
  name: string;
  is_best?: boolean;
  is_naive?: boolean;
  train_rows?: number;
  metrics: MetricMap;
  confusion_matrix: number[][];
  per_class?: Record<string, ClassMetric>;
  per_class_recall?: Record<string, number>;
};
type DatasetReport = {
  meta: {
    title: string;
    subtitle: string;
    description?: string;
    source?: string;
    source_url?: string;
    generated_at?: string;
    hero_metric?: string;
    target_name?: string;
    classes: string[];
    dataset_stats: { n_samples: number; n_features: number; n_classes: number; n_train: number; n_test: number };
    target_stats: { class_distribution: Record<string, number>; rare_class: string; imbalance_ratio: number; rare_class_ratio: number };
  };
  models: ModelResult[];
};

type Task = "flight_delay" | "taxi_payment" | "cover_type";
const DATASET_PATHS: Record<Task, string> = {
  flight_delay: "/artifacts/classification/flight_delay/report.json",
  taxi_payment: "/artifacts/classification/taxi_payment/report.json",
  cover_type: "/artifacts/classification/cover_type/report.json",
};

const fmt = (value?: number | null, digits = 4) =>
  value === undefined || value === null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
const fmtPct = (value?: number | null) =>
  value === undefined || value === null || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(2)}%`;
const fmtInt = (value?: number | null) =>
  value === undefined || value === null || !Number.isFinite(value) ? "—" : Math.round(value).toLocaleString("ru-RU");

function MetricCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "info" | "success" | "danger" | "neutral" }) {
  const color = tone === "danger" ? "text-rose-500" : tone === "success" ? "text-emerald-500" : tone === "info" ? "text-indigo-500" : "";
  return (
    <Card className="p-3.5">
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </Card>
  );
}

function ConfusionMatrix({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  if (!matrix?.length) return null;
  const max = Math.max(1, ...matrix.flat());
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-widest uppercase">Confusion matrix</h3>
        <span className="text-[10px] text-slate-500">строки — факт · столбцы — прогноз</span>
      </div>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `minmax(90px, 145px) repeat(${labels.length}, minmax(42px, 1fr))` }}>
          <div />
          {labels.map((label) => <div key={`col-${label}`} title={label} className="text-[10px] text-slate-500 text-center px-1 truncate">{label}</div>)}
          {matrix.map((row, i) => (
            <div key={`row-${i}`} className="contents">
              <div title={labels[i]} className="text-[10px] text-slate-500 flex items-center pr-2 truncate">{labels[i]}</div>
              {row.map((value, j) => {
                const diagonal = i === j;
                const intensity = value / max;
                return (
                  <div
                    key={`${i}-${j}`}
                    title={`Факт: ${labels[i]} → прогноз: ${labels[j]} · ${fmtInt(value)}`}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold ${diagonal ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200"}`}
                    style={{ backgroundColor: diagonal ? `rgba(16,185,129,${0.08 + intensity * 0.7})` : value > 0 ? `rgba(244,63,94,${0.06 + intensity * 0.58})` : "rgba(148,163,184,0.05)" }}
                  >
                    {value > 0 ? fmtInt(value) : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function LargeDatasetPage({ task }: { task: Task }) {
  const [report, setReport] = useState<DatasetReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setReport(null);
    setError(null);
    fetch(DATASET_PATHS[task], { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${DATASET_PATHS[task]}`);
        return response.json() as Promise<DatasetReport>;
      })
      .then((json) => {
        if (!alive) return;
        if (!json?.meta?.classes?.length || !json?.models?.length) throw new Error("В report.json не хватает classes или models.");
        setReport(json);
        setSelectedName(json.models.find((m) => m.is_best)?.name ?? json.models[0].name);
      })
      .catch((reason) => { if (alive) setError(String(reason)); });
    return () => { alive = false; };
  }, [task]);

  const selected = useMemo(() => report?.models.find((m) => m.name === selectedName) ?? report?.models[0] ?? null, [report, selectedName]);
  const classRows = useMemo(() => {
    if (!report) return [];
    return report.meta.classes.map((label) => ({
      label,
      count: report.meta.target_stats.class_distribution[label] ?? 0,
      recall: selected?.per_class_recall?.[label] ?? selected?.per_class?.[label]?.recall ?? 0,
      rare: label === report.meta.target_stats.rare_class,
    }));
  }, [report, selected]);

  if (error) {
    return (
      <Card>
        <p className="text-rose-500 font-semibold">Не удалось загрузить отчёт</p>
        <p className="text-sm text-slate-500 mt-2">{error}</p>
        <p className="text-sm text-slate-500 mt-2">Сначала выполните соответствующий notebook в Spark и проверьте наличие JSON в artifacts/classification/.</p>
      </Card>
    );
  }
  if (!report || !selected) {
    return <div className="space-y-4 animate-pulse"><div className="h-36 rounded-2xl bg-slate-500/10" /><div className="grid sm:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-500/10" />)}</div><div className="h-72 rounded-2xl bg-slate-500/10" /></div>;
  }

  const heroMetric = report.meta.hero_metric ?? "f1_macro";
  const heroValue = selected.metrics[heroMetric];
  const metricCards: { key: string; label: string; percent?: boolean; tone?: "info" | "success" | "danger" | "neutral" }[] = [
    { key: "f1_macro", label: "Macro-F1", tone: "info" },
    { key: "f1_weighted", label: "Weighted-F1" },
    { key: "accuracy", label: "Accuracy", percent: true },
    { key: "balanced_accuracy", label: "Balanced accuracy", percent: true },
    { key: "precision_macro", label: "Precision · macro", percent: true },
    { key: "recall_macro", label: "Recall · macro", percent: true },
    { key: "mcc", label: "MCC" },
    { key: "kappa", label: "Cohen κ" },
  ];
  if (report.meta.dataset_stats.n_classes === 2) {
    metricCards.push({ key: "roc_auc", label: "ROC-AUC" }, { key: "pr_auc", label: "PR-AUC" });
  }

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <p className="text-xs uppercase tracking-widest text-slate-500">{report.meta.title}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h2 className="text-2xl font-bold">{selected.name}</h2>
          {selected.is_best && <Badge tone="success">best · macro-F1</Badge>}
          {selected.is_naive && <Badge tone="danger">baseline</Badge>}
          <Badge tone="info">Spark MLlib</Badge>
        </div>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <span className="text-4xl font-black bg-gradient-to-br from-indigo-500 to-cyan-500 bg-clip-text text-transparent">{fmt(heroValue, 4)}</span>
          <Badge tone="info">{heroMetric.replaceAll("_", "-")}</Badge>
        </div>
        <p className="text-sm text-slate-500 mt-3">{report.meta.subtitle}</p>
        {report.meta.description && <p className="text-sm text-slate-500 mt-2 max-w-4xl">{report.meta.description}</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-slate-500">
          <span>Строк: <b className="text-slate-700 dark:text-slate-200">{fmtInt(report.meta.dataset_stats.n_samples)}</b></span>
          <span>Признаков: <b className="text-slate-700 dark:text-slate-200">{fmtInt(report.meta.dataset_stats.n_features)}</b></span>
          <span>Классов: <b className="text-slate-700 dark:text-slate-200">{report.meta.dataset_stats.n_classes}</b></span>
          <span>Train / test: <b className="text-slate-700 dark:text-slate-200">{fmtInt(report.meta.dataset_stats.n_train)} / {fmtInt(report.meta.dataset_stats.n_test)}</b></span>
        </div>
        {report.meta.source && <p className="text-[11px] text-slate-500 mt-3">Источник: {report.meta.source}{report.meta.source_url && <> · <a className="text-indigo-500 hover:underline" href={report.meta.source_url} target="_blank" rel="noreferrer">официальная страница</a></>}</p>}
      </Card>

      <div className="flex flex-wrap gap-2">
        {report.models.map((model) => (
          <button key={model.name} onClick={() => setSelectedName(model.name)} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${selected.name === model.name ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/25" : "border-border text-slate-500 hover:border-indigo-500/50"}`}>
            {model.name}{model.is_best && <span className="ml-2 text-[10px] opacity-75">best</span>}{model.is_naive && <span className="ml-2 text-[10px] opacity-75">baseline</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metricCards.map((metric) => <MetricCard key={metric.key} label={metric.label} value={metric.percent ? fmtPct(selected.metrics[metric.key]) : fmt(selected.metrics[metric.key])} tone={metric.tone} />)}
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <Card>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-widest uppercase">Распределение целевого класса</h3>
          <p className="text-[11px] text-slate-500 mt-1">Редкий класс подсвечен коралловым цветом.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classRows} margin={{ top: 12, right: 8, left: 4, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
              <XAxis dataKey="label" interval={0} angle={-18} textAnchor="end" height={56} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => Number(v).toLocaleString("ru-RU")} />
              <Tooltip formatter={(value: number) => fmtInt(value)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {classRows.map((row) => <Cell key={row.label} fill={row.rare ? "#fb7185" : "#6366f1"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-slate-500 mt-2">Дисбаланс max/min: <b>{fmt(report.meta.target_stats.imbalance_ratio, 2)}×</b> · доля редкого класса: <b>{fmtPct(report.meta.target_stats.rare_class_ratio)}</b></p>
        </Card>
        <Card>
          <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-widest uppercase">Recall по каждому классу</h3>
          <p className="text-[11px] text-slate-500 mt-1">Метрика относится к выбранной модели и тестовой выборке.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classRows} margin={{ top: 12, right: 8, left: 4, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
              <XAxis dataKey="label" interval={0} angle={-18} textAnchor="end" height={56} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => fmt(value, 4)} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
              <Bar dataKey="recall" radius={[6, 6, 0, 0]}>
                {classRows.map((row) => <Cell key={row.label} fill={row.rare ? "#fb7185" : "#10b981"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <ConfusionMatrix labels={report.meta.classes} matrix={selected.confusion_matrix} />

      <Card>
        <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-widest uppercase">Сравнение моделей</h3>
        <div className="mt-3 overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-border"><tr><th className="text-left py-2 pr-4">Модель</th><th className="text-right px-2">Macro-F1</th><th className="text-right px-2">Weighted-F1</th><th className="text-right px-2">Accuracy</th><th className="text-right px-2">Balanced acc.</th><th className="text-right px-2">Train rows</th></tr></thead>
            <tbody>{report.models.map((model) => <tr key={model.name} className={`border-b border-border/50 ${model.is_best ? "bg-emerald-500/5" : ""} ${model.is_naive ? "opacity-70" : ""}`}><td className="py-2 pr-4">{model.name}{model.is_best && <Badge tone="success" className="ml-2">best</Badge>}{model.is_naive && <Badge tone="danger" className="ml-2">baseline</Badge>}</td><td className="text-right px-2 font-mono">{fmt(model.metrics.f1_macro)}</td><td className="text-right px-2 font-mono">{fmt(model.metrics.f1_weighted)}</td><td className="text-right px-2 font-mono">{fmtPct(model.metrics.accuracy)}</td><td className="text-right px-2 font-mono">{fmtPct(model.metrics.balanced_accuracy)}</td><td className="text-right px-2 font-mono">{fmtInt(model.train_rows ?? 0)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Вычисления метрик и confusion matrix агрегируются на Spark; фронтенд загружает только компактный JSON-отчёт.</p>
      </Card>
    </div>
  );
}
