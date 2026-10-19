"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { BarChart3, GitCompare, Grid, Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DatasetReport,
  ModelResult,
  classMetric,
  fmt,
  fmtInt,
  fmtPct,
  getClassDistribution,
  metric,
} from "./types";
import { SectionHeading } from "./Shared";

const SERIES = ["#818cf8", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#c4b5fd", "#60a5fa"];
const tooltipStyle = {
  backgroundColor: "rgba(12, 18, 34, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: 12,
  color: "#e2e8f0",
  fontSize: 11,
  boxShadow: "0 12px 32px rgba(0,0,0,.22)",
};

export function ClassDistributionPanel({
  report,
  title = "Распределение целевых классов",
  description = "Фактическое распределение в исходном наборе, до train/test split.",
  compact = false,
}: {
  report: DatasetReport;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const rows = useMemo(() => getClassDistribution(report).sort((a, b) => b.count - a.count), [report]);
  const maxCount = Math.max(1, ...rows.map((row) => row.count));
  const distributionTotal = rows.reduce((total, row) => total + row.count, 0);
  const rareClass = report.meta.target_stats.rare_class;

  return (
    <Card className="!p-4 md:!p-5">
      <SectionHeading eyebrow="CLASS MIX" title={title} description={description} trailing={<Badge tone="info">{rows.length} классов</Badge>} />
      <div className={compact ? "space-y-3" : "space-y-4"}>
        {rows.map((row, index) => {
          const pct = distributionTotal > 0 ? row.count / distributionTotal : row.share;
          const color = row.rare ? "#fb7185" : SERIES[index % SERIES.length];
          return (
            <div key={row.label}>
              <div className="flex items-end justify-between gap-3 mb-1.5">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate" title={row.label}>{row.label}</span>
                  {row.label === rareClass && <span className="text-[8px] uppercase tracking-wider rounded-md px-1.5 py-0.5 bg-rose-500/10 text-rose-500 shrink-0">rare</span>}
                </div>
                <div className="text-right shrink-0"><span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(row.count)}</span><span className="ml-2 text-[10px] tabular-nums text-slate-500">{fmtPct(pct, 2)}</span></div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-500/[0.09] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, (row.count / maxCount) * 100))}%`, background: `linear-gradient(90deg, ${color}, ${color}b8)` }} /></div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-5 pt-3 border-t border-border/70 text-[10px] text-slate-500">
        <span>Всего в выборке</span><b className="text-slate-700 dark:text-slate-200 tabular-nums">{fmtInt(distributionTotal)}</b>
      </div>
    </Card>
  );
}

export function ModelComparisonPanel({ report, selected }: { report: DatasetReport; selected: ModelResult }) {
  const data = report.models.map((model) => ({
    name: model.name,
    macro: metric(model, "f1_macro") ?? 0,
    weighted: metric(model, "f1_weighted") ?? 0,
    balanced: metric(model, "balanced_accuracy") ?? 0,
    best: Boolean(model.is_best),
    naive: Boolean(model.is_naive),
  }));
  return (
    <Card className="!p-4 md:!p-5">
      <SectionHeading eyebrow="MODEL BENCHMARK" title="Сравнение моделей" description="Одинаковая тестовая выборка; baseline показан для масштаба качества." trailing={<BarChart3 size={16} className="text-indigo-400" />} />
      <div className="h-[285px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 14, left: 7, bottom: 5 }} barGap={3}>
            <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4 5" />
            <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={145} interval={0} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => [`${(Number(value) * 100).toFixed(1)}%`, String(name)]} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 7 }} />
            <Bar dataKey="macro" name="Macro-F1" fill="#818cf8" radius={[0, 5, 5, 0]} maxBarSize={16} />
            <Bar dataKey="weighted" name="Weighted-F1" fill="#22d3ee" radius={[0, 5, 5, 0]} maxBarSize={16} />
            <Bar dataKey="balanced" name="Balanced acc." fill="#34d399" radius={[0, 5, 5, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {report.models.map((model) => <span key={model.name} className={`inline-flex items-center gap-1.5 text-[9px] rounded-lg border px-2 py-1 ${model.name === selected.name ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-500" : "border-border text-slate-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${model.is_naive ? "bg-amber-400" : model.is_best ? "bg-emerald-400" : "bg-violet-400"}`} />{model.name}{model.is_best ? " · best" : model.is_naive ? " · baseline" : ""}</span>)}
      </div>
    </Card>
  );
}

export function ClassPerformancePanel({ report, model, title = "Качество по классам", description = "Precision, recall и F1 считаются отдельно для каждого класса." }: { report: DatasetReport; model: ModelResult; title?: string; description?: string }) {
  const rows = report.meta.classes.map((label, index) => ({
    label,
    precision: classMetric(model, label, "precision") ?? 0,
    recall: classMetric(model, label, "recall") ?? 0,
    f1: classMetric(model, label, "f1") ?? 0,
    support: classMetric(model, label, "support") ?? (model.confusion_matrix[index]?.reduce((a, b) => a + b, 0) ?? 0),
    rare: label === report.meta.target_stats.rare_class,
  }));
  const chartHeight = Math.max(250, rows.length * 39 + 35);
  return (
    <Card className="!p-4 md:!p-5">
      <SectionHeading eyebrow="CLASS-LEVEL QUALITY" title={title} description={description} trailing={<Badge tone="info">{model.name}</Badge>} />
      <div style={{ height: chartHeight }} className="min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 4 }} barGap={2}>
            <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.07} strokeDasharray="4 5" />
            <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" width={145} interval={0} tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => [`${(Number(value) * 100).toFixed(1)}%`, String(name)]} labelStyle={{ color: "#f8fafc", marginBottom: 4 }} />
            <Bar dataKey="precision" name="Precision" fill="#818cf8" radius={[0, 4, 4, 0]} maxBarSize={10} />
            <Bar dataKey="recall" name="Recall" fill="#22d3ee" radius={[0, 4, 4, 0]} maxBarSize={10} />
            <Bar dataKey="f1" name="F1" fill="#34d399" radius={[0, 4, 4, 0]} maxBarSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-indigo-400" />Precision</span><span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-cyan-400" />Recall</span><span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-emerald-400" />F1</span><span className="ml-auto">Support: {fmtInt(rows.reduce((sum, row) => sum + row.support, 0))} test rows</span></div>
    </Card>
  );
}

export function ConfusionMatrixPanel({ report, model, title = "Матрица ошибок", description = "Строки — истинный класс, столбцы — предсказанный. Переключайте абсолютные значения и доли по каждой строке." }: { report: DatasetReport; model: ModelResult; title?: string; description?: string }) {
  const [mode, setMode] = useState<"row-rate" | "count">("row-rate");
  const labels = report.meta.classes;
  const matrix = model.confusion_matrix ?? [];
  const maxCount = Math.max(1, ...matrix.flat());
  const width = Math.max(460, 152 + labels.length * (labels.length > 5 ? 54 : 66));
  if (!matrix.length) return null;

  return (
    <Card className="!p-4 md:!p-5">
      <SectionHeading
        eyebrow="ERROR ANALYSIS"
        title={title}
        description={description}
        trailing={<div className="flex items-center gap-1 rounded-lg border border-border p-1"><button type="button" onClick={() => setMode("row-rate")} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition-colors ${mode === "row-rate" ? "bg-indigo-500 text-white" : "text-slate-500 hover:bg-slate-500/10"}`}>Норм., %</button><button type="button" onClick={() => setMode("count")} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition-colors ${mode === "count" ? "bg-indigo-500 text-white" : "text-slate-500 hover:bg-slate-500/10"}`}>Counts</button></div>}
      />
      <div className="overflow-x-auto scrollbar-thin pb-2">
        <div style={{ minWidth: width }}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `140px repeat(${labels.length}, minmax(0, 1fr))` }}>
            <div className="flex items-end pb-1 text-[9px] uppercase tracking-wider text-slate-500">Actual ↓ / Predicted →</div>
            {labels.map((label) => <div key={`head-${label}`} title={label} className="flex min-h-[42px] items-end justify-center pb-1 text-center text-[9px] font-semibold leading-tight text-slate-500 break-words">{label}</div>)}
            {matrix.map((row, i) => {
              const rowTotal = row.reduce((sum, value) => sum + value, 0);
              return <div key={`r-${i}`} className="contents">
                <div title={labels[i]} className={`flex items-center pr-2 text-[10px] font-semibold leading-tight ${labels[i] === report.meta.target_stats.rare_class ? "text-rose-500" : "text-slate-600 dark:text-slate-300"}`}><span className="mr-2 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: labels[i] === report.meta.target_stats.rare_class ? "#fb7185" : SERIES[i % SERIES.length] }} />{labels[i]}</div>
                {row.map((value, j) => {
                  const diagonal = i === j;
                  const normalized = rowTotal > 0 ? value / rowTotal : 0;
                  const intensity = mode === "row-rate" ? normalized : value / maxCount;
                  const background = diagonal
                    ? `rgba(52, 211, 153, ${0.07 + intensity * 0.68})`
                    : value > 0 ? `rgba(251, 113, 133, ${0.05 + intensity * 0.58})` : "rgba(148,163,184,0.055)";
                  const darkText = intensity > 0.58;
                  return <div key={`${i}-${j}`} title={`Факт: ${labels[i]} → прогноз: ${labels[j]}\n${fmtInt(value)} наблюдений · ${fmtPct(normalized, 2)} строки`} className={`flex aspect-square min-h-[42px] items-center justify-center rounded-lg border text-[10px] font-bold tabular-nums transition-transform hover:scale-[1.03] ${diagonal ? "border-emerald-400/20" : "border-slate-400/10"} ${darkText ? "text-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-300"}`} style={{ backgroundColor: background }}>{mode === "count" ? (value ? fmtInt(value) : "·") : fmtPct(normalized, 0)}</div>;
                })}
              </div>;
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border/70 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-emerald-400" />Верно классифицировано</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-rose-400" />Ошибки классификации</span><span>Тестовая выборка · {fmtInt(matrix.flat().reduce((a, b) => a + b, 0))} записей</span></div>
    </Card>
  );
}

export function ModelMetricsTable({ report, selected }: { report: DatasetReport; selected: ModelResult }) {
  return (
    <Card className="!p-4 md:!p-5">
      <SectionHeading eyebrow="EVALUATION SUMMARY" title="Сводная таблица моделей" description="Компактное сравнение ключевых метрик для контроля компромисса между классами." trailing={<GitCompare size={16} className="text-indigo-400" />} />
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[600px] text-xs">
          <thead><tr className="border-b border-border text-[9px] uppercase tracking-wider text-slate-500"><th className="text-left font-bold py-3 pr-4">Модель</th><th className="text-right font-bold px-3 py-3">Macro-F1</th><th className="text-right font-bold px-3 py-3">Weighted-F1</th><th className="text-right font-bold px-3 py-3">Accuracy</th><th className="text-right font-bold px-3 py-3">Balanced acc.</th><th className="text-right font-bold pl-3 py-3">Train rows</th></tr></thead>
          <tbody>{report.models.map((model) => {
            const active = model.name === selected.name;
            return <tr key={model.name} className={`border-b border-border/50 last:border-b-0 ${active ? "bg-indigo-500/[0.055]" : ""}`}><td className="py-3 pr-4"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full shrink-0 ${model.is_naive ? "bg-amber-400" : model.is_best ? "bg-emerald-400" : "bg-indigo-400"}`} /><span className="font-semibold text-slate-700 dark:text-slate-200">{model.name}</span>{model.is_best && <Badge tone="success" className="!px-1.5 !py-0.5 !text-[9px]">best</Badge>}{model.is_naive && <Badge tone="warning" className="!px-1.5 !py-0.5 !text-[9px]">baseline</Badge>}</div></td><td className={`text-right px-3 py-3 font-mono ${active ? "text-indigo-500 font-bold" : "text-slate-600 dark:text-slate-300"}`}>{fmt(metric(model, "f1_macro"))}</td><td className="text-right px-3 py-3 font-mono text-slate-600 dark:text-slate-300">{fmt(metric(model, "f1_weighted"))}</td><td className="text-right px-3 py-3 font-mono text-slate-600 dark:text-slate-300">{fmtPct(metric(model, "accuracy"))}</td><td className="text-right px-3 py-3 font-mono text-slate-600 dark:text-slate-300">{fmtPct(metric(model, "balanced_accuracy"))}</td><td className="text-right pl-3 py-3 font-mono text-slate-500">{fmtInt(model.train_rows ?? 0)}</td></tr>;
          })}</tbody>
        </table>
      </div>
      <p className="text-[10px] leading-relaxed text-slate-500 mt-3">Метрики рассчитаны ноутбуком на Spark по тестовым прогнозам. Интерфейс показывает сохранённые значения и не переобучает модель.</p>
    </Card>
  );
}

export function RareClassPanel({ report, model, limit = 4 }: { report: DatasetReport; model: ModelResult; limit?: number }) {
  const rows = getClassDistribution(report)
    .map((row) => ({ ...row, recall: classMetric(model, row.label, "recall") ?? 0, f1: classMetric(model, row.label, "f1") ?? 0 }))
    .sort((a, b) => a.count - b.count)
    .slice(0, limit);
  const total = Math.max(1, report.meta.dataset_stats.n_samples);
  return (
    <Card className="!p-4 md:!p-5">
      <SectionHeading eyebrow="MINORITY CLASS WATCH" title="Редкие классы под наблюдением" description="Сочетание частоты и качества позволяет увидеть, не теряется ли редкая категория за общей метрикой." trailing={<Filter size={16} className="text-amber-400" />} />
      <div className="space-y-3">
        {rows.map((row, index) => <div key={row.label} className="rounded-xl border border-border/70 bg-slate-500/[0.025] p-3">
          <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2 min-w-0"><span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/10 text-[10px] font-black text-rose-500 shrink-0">{index + 1}</span><div className="min-w-0"><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{row.label}</p><p className="text-[10px] text-slate-500 mt-1">{fmtInt(row.count)} строк · {fmtPct(row.count / total, 2)} датасета</p></div></div><div className="text-right shrink-0"><p className="text-sm font-black text-rose-500">{fmt(row.f1, 3)}</p><p className="text-[9px] uppercase tracking-wider text-slate-500">class F1</p></div></div>
          <div className="grid grid-cols-2 gap-2 mt-3"><div><div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>Recall</span><b className="text-slate-700 dark:text-slate-200">{fmtPct(row.recall)}</b></div><div className="h-1.5 rounded-full bg-slate-500/10 overflow-hidden"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(0, Math.min(100, row.recall * 100))}%` }} /></div></div><div><div className="flex justify-between text-[9px] text-slate-500 mb-1"><span>Share</span><b className="text-slate-700 dark:text-slate-200">{fmtPct(row.count / total, 2)}</b></div><div className="h-1.5 rounded-full bg-slate-500/10 overflow-hidden"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(0, Math.min(100, (row.count / total) * 100))}%` }} /></div></div></div>
        </div>)}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-500/[0.045] px-3 py-2.5 text-[10px]"><span className="text-slate-500">Макс. / мин. частота</span><b className="text-amber-500 tabular-nums">{fmt(report.meta.target_stats.imbalance_ratio, 1)}×</b></div>
    </Card>
  );
}

export function BestOffDiagonalPanel({ report, model }: { report: DatasetReport; model: ModelResult }) {
  const confusion = useMemo(() => {
    const matrix = model.confusion_matrix ?? [];
    let found: { actual: string; predicted: string; count: number } | null = null;
    for (let i = 0; i < matrix.length; i += 1) {
      for (let j = 0; j < (matrix[i]?.length ?? 0); j += 1) {
        const value = Number(matrix[i][j] ?? 0);
        if (i !== j && value > 0 && (!found || value > found.count)) {
          found = {
            actual: report.meta.classes[i] ?? String(i),
            predicted: report.meta.classes[j] ?? String(j),
            count: value,
          };
        }
      }
    }
    return found;
  }, [model, report]);
  return (
    <Card className="!p-4 md:!p-5">
      <SectionHeading eyebrow="ERROR HOTSPOT" title="Самая частая путаница" description="Самая крупная внедиагональная ячейка матрицы ошибок выбранной модели." trailing={<Grid size={16} className="text-rose-400" />} />
      {confusion ? <div className="rounded-xl border border-rose-400/20 bg-gradient-to-br from-rose-500/[0.07] to-amber-500/[0.035] p-4">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Истинный класс → предсказанный</div>
        <div className="flex flex-wrap items-center gap-2 mt-2"><span className="rounded-lg border border-border bg-slate-500/[0.04] px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">{confusion.actual}</span><span className="text-rose-400">→</span><span className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-2 text-xs font-bold text-rose-500">{confusion.predicted}</span></div>
        <div className="mt-4 flex items-end gap-3"><p className="text-3xl font-black tracking-tight text-rose-500 tabular-nums">{fmtInt(confusion.count)}</p><p className="text-[10px] text-slate-500 pb-1">ошибочных классификаций в тестовой выборке</p></div>
      </div> : <p className="text-xs text-slate-500">В матрице ошибок нет доступных внедиагональных значений.</p>}
    </Card>
  );
}
