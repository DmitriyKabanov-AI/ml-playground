"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DigitsReport, DigitsModel,
  loadDigitsReport, findBestDigitsModel,
} from "@/lib/data/digits";

const fmtPct = (v?: number | null) =>
  v === undefined || v === null || Number.isNaN(v) ? "—" : `${(v * 100).toFixed(2)}%`;
const fmtNum = (v?: number | null, digits = 4) =>
  v === undefined || v === null || Number.isNaN(v) ? "—" : v.toFixed(digits);

// FIX: baseline всегда уходит в конец — не забивает верх списка.
function sortModels(models: DigitsModel[]): DigitsModel[] {
  return [...models].sort((a, b) => {
    if (!!a.is_naive !== !!b.is_naive) return a.is_naive ? 1 : -1;
    const av = a.metrics.f1_macro ?? -Infinity;
    const bv = b.metrics.f1_macro ?? -Infinity;
    return bv - av;
  });
}

function HeroCard({ report, best }: { report: DigitsReport; best: DigitsModel }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
      <p className="text-xs uppercase tracking-widest text-slate-500">
        {report.meta.title}
      </p>
      <h1 className="text-2xl font-bold mt-1">{report.headline.best_model}</h1>
      <div className="flex items-end gap-3 mt-4">
        <span className="text-4xl font-black bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
          {fmtNum(best.metrics.f1_macro)}
        </span>
        <Badge tone="info">macro-F1</Badge>
      </div>
      <p className="text-sm text-slate-500 mt-3">{report.meta.subtitle}</p>
    </Card>
  );
}

function WeightedVsMacroTrap({ report, best }: { report: DigitsReport; best: DigitsModel }) {
  const gap = report.headline?.diagnostic_verdict?.weighted_minus_macro_gap;
  const ts = report.meta.target_stats;
  return (
    <Card className="border border-amber-500/40 bg-amber-500/5">
      <p className="text-sm">
        <b>⚠️ Weighted-F1 маскирует проблему:</b> у модели{" "}
        <span className="font-mono">{best.name}</span>:
      </p>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <p className="text-[11px] text-slate-500 uppercase">macro-F1</p>
          <p className="text-2xl font-bold text-violet-500">
            {fmtNum(best.metrics.f1_macro)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 uppercase">weighted-F1</p>
          <p className="text-2xl font-bold text-slate-400">
            {fmtNum(best.metrics.f1_weighted)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 uppercase">разрыв</p>
          <p className="text-2xl font-bold text-amber-500">
            {Number.isFinite(gap) ? `+${(gap as number).toFixed(4)}` : "—"}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        При imbalance{" "}
        {ts && Number.isFinite(ts.imbalance_ratio)
          ? ts.imbalance_ratio.toFixed(2)
          : "—"}
        :1 редкий класс физически весит только{" "}
        {ts && Number.isFinite(ts.rare_class_ratio)
          ? (ts.rare_class_ratio * 100).toFixed(2)
          : "—"}
        % — он не может сильно сдвинуть weighted-F1. Настоящая цена дисбаланса
        видна только в <b>per-class recall</b>.
      </p>
    </Card>
  );
}

function MetricCard({
  label, value, tone,
}: { label: string; value: string; tone?: "danger" | "success" | "info" }) {
  const color =
    tone === "danger" ? "text-rose-500" :
    tone === "success" ? "text-emerald-500" :
    tone === "info" ? "text-indigo-500" : "";
  return (
    <Card className="p-3.5">
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </Card>
  );
}

// FIX: единая таблица сравнения — теперь видно и GBoost, и baseline рядом.
function ModelComparisonTable({
  models, rareClass,
}: {
  models: DigitsModel[];
  rareClass: string;
}) {
  if (!models.length) return null;
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Сравнение моделей · sorted by macro-F1
      </h3>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-border">
            <tr>
              <th className="text-left py-2">Model</th>
              <th className="text-right">macro-F1</th>
              <th className="text-right">weighted-F1</th>
              <th className="text-right">accuracy</th>
              <th className="text-right">MCC</th>
              <th className="text-right">Cohen κ</th>
              <th className="text-right">recall «{rareClass}»</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => {
              const isBest = m.is_best;
              const isNaive = !!m.is_naive;
              const rare = m.per_class_recall?.[rareClass] ?? m.rare_class_recall;
              return (
                <tr
                  key={m.name}
                  className={`border-b border-border/50 ${isNaive ? "opacity-60" : ""} ${
                    isBest ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <td className="py-2">
                    {m.name}{" "}
                    {isBest && <Badge tone="success" className="ml-2">best</Badge>}
                    {isNaive && <Badge tone="danger" className="ml-2">baseline</Badge>}
                  </td>
                  <td className={`text-right font-mono ${isBest ? "font-bold text-emerald-500" : ""}`}>
                    {fmtNum(m.metrics.f1_macro)}
                  </td>
                  <td className="text-right font-mono">{fmtNum(m.metrics.f1_weighted)}</td>
                  <td className="text-right font-mono">{fmtNum(m.metrics.accuracy)}</td>
                  <td className="text-right font-mono">{fmtNum(m.metrics.mcc, 3)}</td>
                  <td className="text-right font-mono">{fmtNum(m.metrics.kappa, 3)}</td>
                  <td className={`text-right font-mono ${isNaive ? "text-rose-500" : ""}`}>
                    {fmtNum(rare, 3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PerClassRecallChart({
  data, rareClass,
}: {
  data: { class: string; recall: number; support: number; is_rare: boolean }[];
  rareClass: string;
}) {
  if (!Array.isArray(data) || !data.length) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Per-class recall
        </h3>
        <p className="text-sm text-slate-500 mt-3">
          В артефакте нет данных per_class_recall.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Per-class recall · редкий класс «{rareClass}» подсвечен
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey="class" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
            formatter={(v: number, n: string) =>
              n === "recall" ? Number(v).toFixed(3) : (v as any)
            }
          />
          <ReferenceLine y={0.9} stroke="#94a3b8" strokeDasharray="4 4" />
          <Bar dataKey="recall" radius={[8, 8, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.class} fill={d.is_rare ? "#f43f5e" : "#10b981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// FIX: feature importance для выбранной модели.
// У baseline её нет — показываем аккуратную заглушку, а не пустоту.
function FeatureImportanceChart({
  data, modelName, isNaive,
}: {
  data?: { name: string; value: number }[];
  modelName: string;
  isNaive: boolean;
}) {
  if (isNaive || !Array.isArray(data) || !data.length) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Feature importance (top-15)
        </h3>
        <p className="text-sm text-slate-500 mt-3">
          {isNaive
            ? <>У baseline-модели <b>{modelName}</b> нет feature importance — она игнорирует признаки.</>
            : <>В артефакте нет feature importance для <b>{modelName}</b>.</>}
        </p>
      </Card>
    );
  }
  const colors = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#a855f7", "#14b8a6"];
  const top = [...data].slice(0, 15);
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Feature importance (top-15)
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(260, top.length * 22)}>
        <BarChart data={top} layout="vertical" margin={{ left: 10 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
            formatter={(v: number) => Number(v).toFixed(4)}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {top.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function Confusion10x10({
  labels, matrix, rareClass,
}: { labels: string[]; matrix: number[][]; rareClass: string }) {
  if (!Array.isArray(matrix) || !matrix.length) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Confusion matrix 10×10
        </h3>
        <p className="text-sm text-slate-500 mt-3">
          В артефакте нет confusion_matrix.
        </p>
      </Card>
    );
  }
  const max = Math.max(1, ...matrix.flat());
  const rareIdx = labels.indexOf(rareClass);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Confusion matrix 10×10
        </h3>
      </div>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <div
          className="inline-grid gap-0.5"
          style={{ gridTemplateColumns: `28px repeat(${labels.length}, minmax(34px, 1fr))` }}
        >
          <div />
          {labels.map((l) => (
            <div
              key={l}
              className={`text-[10px] text-center ${
                l === rareClass ? "text-rose-500 font-bold" : "text-slate-500"
              }`}
            >
              {l}
            </div>
          ))}
          {matrix.map((row, i) => (
            <div key={`row-${i}`} className="contents">
              <div
                className={`text-[10px] flex items-center justify-end pr-2 ${
                  i === rareIdx ? "text-rose-500 font-bold" : "text-slate-500"
                }`}
              >
                {labels[i]}
              </div>
              {row.map((val, j) => {
                const intensity = max > 0 ? val / max : 0;
                const isDiag = i === j;
                const isRareRow = i === rareIdx;
                return (
                  <div
                    key={`${i}-${j}`}
                    title={`actual=${labels[i]} → predicted=${labels[j]} · ${val}`}
                    className={`aspect-square rounded flex items-center justify-center text-[10px] font-semibold ${
                      isDiag
                        ? "text-emerald-900"
                        : val > 0
                        ? "text-rose-900"
                        : "text-slate-400"
                    } ${isRareRow ? "ring-1 ring-rose-400/40" : ""}`}
                    style={{
                      backgroundColor: isDiag
                        ? `rgba(16,185,129,${0.08 + intensity * 0.7})`
                        : val > 0
                        ? `rgba(244,63,94,${0.08 + intensity * 0.65})`
                        : "rgba(148,163,184,0.05)",
                    }}
                  >
                    {val > 0 ? val : ""}
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

export function DigitsPage() {
  const [report, setReport] = useState<DigitsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    setReport(null);
    setError(null);
    loadDigitsReport()
      .then((r) => {
        setReport(r);
        // FIX: стартуем с лучшей модели; baseline всегда в конце списка
        const best = r.models.find((m) => m.is_best) ?? r.models[0];
        setSelectedName(best?.name ?? null);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // FIX: сортируем один раз — baseline в конец, чтобы не мешал обзору.
  const sortedModels = useMemo(
    () => (report ? sortModels(report.models) : []),
    [report]
  );
  const best = useMemo(() => (report ? findBestDigitsModel(report) : null), [report]);
  const selected = useMemo(() => {
    if (!sortedModels.length) return null;
    if (selectedName) {
      const found = sortedModels.find((m) => m.name === selectedName);
      if (found) return found;
    }
    return sortedModels[0];
  }, [sortedModels, selectedName]);

  if (error) {
    return (
      <Card>
        <p className="text-rose-500">Ошибка загрузки артефакта: {error}</p>
      </Card>
    );
  }
  if (!report || !best || !selected) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 w-full rounded-2xl bg-slate-500/10" />
        <div className="h-32 w-full rounded-2xl bg-slate-500/10" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 w-full rounded-2xl bg-slate-500/10" />
          ))}
        </div>
        <div className="h-72 w-full rounded-2xl bg-slate-500/10" />
      </div>
    );
  }

  const rareClass = report.meta?.target_stats?.rare_class ?? "8";

  // FIX: per-class recall выбранной модели; fallback — общий блок из артефакта
  const perClassRecall = selected.per_class_recall
    ? Object.entries(selected.per_class_recall).map(([cls, r]) => ({
        class: cls,
        recall: r as number,
        support: selected.per_class?.[cls]?.support ?? 0,
        is_rare: cls === rareClass,
      }))
    : Array.isArray(report.per_class_recall)
    ? report.per_class_recall.map((x) => ({
        class: x.class,
        recall: x.recall,
        support: x.support,
        is_rare: x.is_rare ?? x.class === rareClass,
      }))
    : [];

  return (
    <div className="space-y-6">
      <HeroCard report={report} best={best} />
      <WeightedVsMacroTrap report={report} best={best} />

      {/* FIX: кнопки моделей с бейджем baseline; baseline всегда в конце */}
      <div className="flex flex-wrap gap-2">
        {sortedModels.map((m) => {
          const active = m.name === selected.name;
          return (
            <button
              key={m.name}
              onClick={() => setSelectedName(m.name)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all inline-flex items-center gap-2 ${
                active
                  ? "bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/30"
                  : "border-border text-slate-500 hover:border-violet-500/50"
              }`}
            >
              <span>{m.name}</span>
              {m.is_best && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? "bg-white/20" : "bg-emerald-500/15 text-emerald-500"
                }`}>
                  best
                </span>
              )}
              {m.is_naive && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? "bg-white/20" : "bg-rose-500/15 text-rose-500"
                }`}>
                  baseline
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="macro-F1" value={fmtNum(selected.metrics.f1_macro)} tone="info" />
        <MetricCard label="weighted-F1" value={fmtNum(selected.metrics.f1_weighted)} />
        <MetricCard label="accuracy" value={fmtPct(selected.metrics.accuracy)} />
        <MetricCard label="balanced acc." value={fmtPct(selected.metrics.balanced_accuracy)} />
        <MetricCard label="MCC" value={fmtNum(selected.metrics.mcc)} />
        <MetricCard label="Cohen κ" value={fmtNum(selected.metrics.kappa)} />
        <MetricCard label="precision (macro)" value={fmtPct(selected.metrics.precision_macro)} />
        <MetricCard label="recall (macro)" value={fmtPct(selected.metrics.recall_macro)} />
        <MetricCard label="Top-2 accuracy" value={fmtPct(selected.metrics.top2_accuracy)} />
        <MetricCard label="Top-3 accuracy" value={fmtPct(selected.metrics.top3_accuracy)} />
      </div>

      {/* FIX: таблица сравнения — GBoost, LogReg, RF и baseline рядом */}
      <ModelComparisonTable models={sortedModels} rareClass={rareClass} />

      <PerClassRecallChart data={perClassRecall} rareClass={rareClass} />

      <div className="grid lg:grid-cols-2 gap-5">
        <Confusion10x10
          labels={report.meta.classes}
          matrix={selected.confusion_matrix}
          rareClass={rareClass}
        />
        <FeatureImportanceChart
          data={selected.feature_importance}
          modelName={selected.name}
          isNaive={!!selected.is_naive}
        />
      </div>
    </div>
  );
}