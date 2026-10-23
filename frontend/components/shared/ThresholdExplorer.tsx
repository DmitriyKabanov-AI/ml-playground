"use client";
import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionTitle } from "@/components/shared/reportUi";
import { BinaryModel, Counts, countsAtIdx, derive, fmtPct, fmtNum, isNum } from "@/lib/data/reports";

type LineKey = "precision" | "recall" | "f1" | "f2" | "mcc" | "f0_5_pos" | "f2_pos" | "f0_5_neg" | "f2_neg";
const LINE_META: Record<LineKey, { label: string; color: string }> = {
  precision: { label: "Precision", color: "#0ea5e9" },
  recall: { label: "Sensitivity / Recall", color: "#34d399" },
  f1: { label: "F1", color: "#8b5cf6" },
  f2: { label: "F2 positive", color: "#f59e0b" },
  mcc: { label: "MCC", color: "#f43f5e" },
  f0_5_pos: { label: "F0.5 · delay", color: "#22d3ee" },
  f2_pos: { label: "F2 · delay", color: "#f59e0b" },
  f0_5_neg: { label: "F0.5 · on-time", color: "#a78bfa" },
  f2_neg: { label: "F2 · on-time", color: "#fb7185" },
};

type Optimum = { threshold: number; score: number; target_class?: string; beta?: number; selection_split?: string; label?: string };
type Optima = Partial<Record<"f0_5_positive" | "f2_positive" | "f0_5_negative" | "f2_negative", Optimum>>;
type Props = {
  model: BinaryModel;
  thr: number | null;
  onThr: (t: number | null) => void;
  counts: Counts;
  lines?: LineKey[];
  tunedLabel: string;
  thresholdOptima?: Optima;
};

const scenarios: { key: keyof Optima; title: string; subtitle: string; color: string }[] = [
  { key: "f0_5_positive", title: "F0.5 · задержка", subtitle: "Positive class · выше вес Precision", color: "border-cyan-500/30 bg-cyan-500/5" },
  { key: "f2_positive", title: "F2 · задержка", subtitle: "Positive class · выше вес Sensitivity", color: "border-amber-500/30 bg-amber-500/5" },
  { key: "f0_5_negative", title: "F0.5 · вовремя", subtitle: "Negative class · выше вес Precision класса 0", color: "border-violet-500/30 bg-violet-500/5" },
  { key: "f2_negative", title: "F2 · вовремя", subtitle: "Negative class · выше вес Recall класса 0", color: "border-rose-500/30 bg-rose-500/5" },
];

/** Сравнение четырех порогов, отобранных по validation; slider оценивает соответствующий порог на test. */
export function ThresholdExplorer({
  model, thr, onThr, counts, lines = ["f0_5_pos", "f2_pos", "f0_5_neg", "f2_neg"], tunedLabel, thresholdOptima,
}: Props) {
  const sw = model.sweep;
  const data = useMemo(() => sw.thresholds.map((t, i) => {
    const c = countsAtIdx(sw, i);
    const tp = c.tp, fp = c.fp, fn = c.fn, tn = c.tn;
    const div = (a: number, b: number) => b ? a / b : 0;
    const f = (p: number, r: number, beta: number) => {
      const b2 = beta * beta, den = b2 * p + r;
      return den ? ((1 + b2) * p * r) / den : 0;
    };
    const precisionPos = div(tp, tp + fp), recallPos = div(tp, tp + fn);
    const precisionNeg = div(tn, tn + fn), recallNeg = div(tn, tn + fp);
    const d = derive(c);
    return {
      t,
      precision: d.precision,
      recall: d.recall,
      f1: d.f1,
      f2: f(precisionPos, recallPos, 2),
      mcc: d.mcc,
      f0_5_pos: f(precisionPos, recallPos, 0.5),
      f2_pos: f(precisionPos, recallPos, 2),
      f0_5_neg: f(precisionNeg, recallNeg, 0.5),
      f2_neg: f(precisionNeg, recallNeg, 2),
    };
  }), [sw]);
  const shown = thr ?? model.threshold;
  const d = derive(counts);
  const step = sw.thresholds.length > 1 ? sw.thresholds[1] - sw.thresholds[0] : 0.001;
  const allOptimaAvailable = scenarios.every((item) => {
    const opt = thresholdOptima?.[item.key];
    return !!opt && Number.isFinite(opt.threshold) && Number.isFinite(opt.score);
  });

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <SectionTitle>Порог решения · четыре F-beta сценария</SectionTitle>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
            Автопорог каждого сценария максимизирует соответствующий F-beta на validation. Кнопка применяет этот порог; метрики и confusion matrix ниже показывают результат на test.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={thr === null ? "success" : "info"}>
            {thr === null ? `${tunedLabel}: ${shown.toFixed(3)}` : `ручной: ${shown.toFixed(3)}`}
          </Badge>
          {thr !== null && <button onClick={() => onThr(null)} className="rounded-lg border border-border px-3 py-1 text-xs text-slate-500 hover:border-indigo-500/50">вернуть {model.threshold.toFixed(3)}</button>}
        </div>
      </div>

      {allOptimaAvailable ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {scenarios.map((scenario) => {
            const opt = thresholdOptima![scenario.key]!;
            const active = Math.abs(shown - opt.threshold) < Math.max(step / 2, 0.0005);
            return (
              <div key={scenario.key} className={`rounded-xl border p-3 ${scenario.color} ${active ? "ring-1 ring-indigo-500/50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">{scenario.title}</div>
                    <div className="mt-1 text-[10px] leading-relaxed text-slate-500">{scenario.subtitle}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-black tabular-nums">{opt.threshold.toFixed(3)}</div>
                    <div className="text-[10px] text-slate-500">Fβ val = {opt.score.toFixed(4)}</div>
                  </div>
                </div>
                <button
                  onClick={() => onThr(opt.threshold)}
                  className={`mt-3 w-full rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${active ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-500" : "border-border bg-white/30 hover:border-indigo-500/50 dark:bg-slate-950/20"}`}
                >
                  {active ? "Этот порог выбран" : `Выбрать порог ${opt.threshold.toFixed(3)}`}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-slate-500">
          Для этой модели в report.json ещё нет validation-оптимумов F0.5/F2. Перезапустите обновлённый ноутбук, чтобы пересоздать report.json; фронтенд намеренно не подбирает эти пороги на test.
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border/70 bg-slate-500/[0.03] p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <label htmlFor="flight-threshold-slider" className="font-semibold">Ручной порог</label>
          <span className="font-mono font-bold tabular-nums">{shown.toFixed(3)}</span>
        </div>
        <input
          id="flight-threshold-slider"
          type="range"
          min={0}
          max={1}
          step={step}
          value={shown}
          onChange={(e) => onThr(parseFloat(e.target.value))}
          className="mt-3 w-full accent-indigo-500"
          aria-label="Порог решения"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>0 · почти все задержки</span><span>1 · только высокие вероятности</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Precision", fmtPct(d.precision)],
            ["Sensitivity", fmtPct(d.recall)],
            ["MCC", fmtNum(d.mcc)],
            ["FPR", fmtPct(d.fpr, 3)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-500/5 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-0.5 font-mono text-sm font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold">Как метрики меняются с порогом · test</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="t" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={34} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => (isNum(v) ? v.toFixed(3) : "—")} labelFormatter={(l) => `порог ${Number(l).toFixed(3)}`} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {lines.map((key) => <Line key={key} type="monotone" dataKey={key} name={LINE_META[key].label} stroke={LINE_META[key].color} strokeWidth={2} dot={false} isAnimationActive={false} />)}
            <ReferenceLine x={shown} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "выбран", position: "insideTopRight", fill: "#6366f1", fontSize: 10 }} />
            {allOptimaAvailable && scenarios.map((scenario) => <ReferenceLine key={scenario.key} x={thresholdOptima![scenario.key]!.threshold} stroke={LINE_META[scenario.key === "f0_5_positive" ? "f0_5_pos" : scenario.key === "f2_positive" ? "f2_pos" : scenario.key === "f0_5_negative" ? "f0_5_neg" : "f2_neg"].color} strokeDasharray="2 5" />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
