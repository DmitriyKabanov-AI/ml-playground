"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DigitsReport, DigitsModel, DigitsSample,
  loadDigitsReport, findBestDigitsModel,
} from "@/lib/data/digits";

const fmtPct = (v?: number | null) =>
  v === undefined || v === null ? "—" : `${(v * 100).toFixed(2)}%`;
const fmtNum = (v?: number | null, digits = 4) =>
  v === undefined || v === null || Number.isNaN(v) ? "—" : v.toFixed(digits);

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
          {best.metrics.f1_macro.toFixed(4)}
        </span>
        <Badge tone="info">macro-F1</Badge>
      </div>
      <p className="text-sm text-slate-500 mt-3">{report.meta.subtitle}</p>
    </Card>
  );
}

function WeightedVsMacroTrap({ report, best }: { report: DigitsReport; best: DigitsModel }) {
  const gap = report.headline.diagnostic_verdict.weighted_minus_macro_gap;
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
            {best.metrics.f1_macro.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 uppercase">weighted-F1</p>
          <p className="text-2xl font-bold text-slate-400">
            {best.metrics.f1_weighted.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 uppercase">разрыв</p>
          <p className="text-2xl font-bold text-amber-500">
            +{gap.toFixed(4)}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        При imbalance {report.meta.target_stats.imbalance_ratio.toFixed(2)}:1 редкий класс
        физически весит только {(report.meta.target_stats.rare_class_ratio * 100).toFixed(2)}% —
        он не может сильно сдвинуть weighted-F1. Настоящая цена дисбаланса видна только
        в <b>per-class recall</b>.
      </p>
    </Card>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" | "info" }) {
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

function PerClassRecallChart({
  data, rareClass,
}: { data: { class: string; recall: number; support: number; is_rare: boolean }[]; rareClass: string }) {
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
              n === "recall" ? v.toFixed(3) : (v as any)
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

function Confusion10x10({
  labels, matrix, rareClass,
}: { labels: string[]; matrix: number[][]; rareClass: string }) {
  const max = Math.max(...matrix.flat());
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
              className={`text-[10px] text-center ${l === rareClass ? "text-rose-500 font-bold" : "text-slate-500"}`}
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
                      isDiag ? "text-emerald-900" : val > 0 ? "text-rose-900" : "text-slate-400"
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
  const [modelIdx, setModelIdx] = useState(0);

  useEffect(() => {
    setReport(null);
    setError(null);
    loadDigitsReport()
      .then((r) => {
        setReport(r);
        const bestIdx = r.models.findIndex((m) => m.is_best);
        setModelIdx(bestIdx >= 0 ? bestIdx : 0);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const best = useMemo(() => (report ? findBestDigitsModel(report) : null), [report]);
  const selected = report ? report.models[modelIdx] : null;

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

  const rareClass = report.meta.target_stats.rare_class;
  const perClassRecall = selected.per_class_recall
    ? Object.entries(selected.per_class_recall).map(([cls, r]) => ({
        class: cls,
        recall: r as number,
        support: selected.per_class[cls]?.support ?? 0,
        is_rare: cls === rareClass,
      }))
    : report.per_class_recall;

  return (
    <div className="space-y-6">
      <HeroCard report={report} best={best} />
      <WeightedVsMacroTrap report={report} best={best} />

      <div className="flex flex-wrap gap-2">
        {report.models.map((m, i) => (
          <button
            key={m.name}
            onClick={() => setModelIdx(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              modelIdx === i
                ? "bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/30"
                : "border-border text-slate-500 hover:border-violet-500/50"
            }`}
          >
            {m.name}
            {m.is_best && <span className="ml-2 text-[10px] opacity-70">best</span>}
          </button>
        ))}
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

      <PerClassRecallChart data={perClassRecall} rareClass={rareClass} />

      <Confusion10x10
        labels={report.meta.classes}
        matrix={selected.confusion_matrix}
        rareClass={rareClass}
      />
    </div>
  );
}