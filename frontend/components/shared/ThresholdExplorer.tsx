"use client";
import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionTitle } from "@/components/shared/reportUi";
import {
  BinaryModel, Counts, countsAtIdx, derive, fmtPct, fmtNum, isNum,
} from "@/lib/data/reports";

type LineKey = "precision" | "recall" | "f1" | "f2" | "mcc";
const LINE_META: Record<LineKey, { label: string; color: string }> = {
  precision: { label: "Precision", color: "#0ea5e9" },
  recall: { label: "Recall", color: "#34d399" },
  f1: { label: "F1", color: "#8b5cf6" },
  f2: { label: "F2", color: "#f59e0b" },
  mcc: { label: "MCC", color: "#f43f5e" },
};

/**
 * Слайдер порога поверх сетки счётчиков из report.json (101 точка, шаг 0.01).
 * thr === null → показываем порог, подобранный ноутбуком на валидации (точные счётчики).
 */
export function ThresholdExplorer({
  model, thr, onThr, counts, lines = ["precision", "recall", "f1", "mcc"], tunedLabel,
}: {
  model: BinaryModel;
  thr: number | null;
  onThr: (t: number | null) => void;
  counts: Counts;
  lines?: LineKey[];
  tunedLabel: string;
}) {
  const sw = model.sweep;
  const data = useMemo(
    () =>
      sw.thresholds.map((t, i) => {
        const d = derive(countsAtIdx(sw, i));
        return { t, precision: d.precision, recall: d.recall, f1: d.f1, f2: d.f2, mcc: d.mcc };
      }),
    [sw]
  );
  const shown = thr ?? model.threshold;
  const d = derive(counts);
  const step = sw.thresholds.length > 1 ? sw.thresholds[1] - sw.thresholds[0] : 0.01;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionTitle>Порог решения</SectionTitle>
        <div className="flex items-center gap-2">
          <Badge tone={thr === null ? "success" : "info"}>
            {thr === null ? `${tunedLabel}: ${shown.toFixed(3)}` : `ручной: ${shown.toFixed(2)}`}
          </Badge>
          {thr !== null && (
            <button
              onClick={() => onThr(null)}
              className="text-xs px-3 py-1 rounded-lg border border-border text-slate-500 hover:border-indigo-500/50"
            >
              вернуть {model.threshold.toFixed(3)}
            </button>
          )}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={step}
        value={shown}
        onChange={(e) => onThr(parseFloat(e.target.value))}
        className="w-full mt-4 accent-indigo-500"
        aria-label="Порог"
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-center">
        {[
          ["Precision", fmtPct(d.precision)],
          ["Recall", fmtPct(d.recall)],
          ["F1", fmtNum(d.f1)],
          ["MCC", fmtNum(d.mcc)],
          ["FPR", fmtPct(d.fpr, 3)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-500/5 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{k}</p>
            <p className="text-sm font-bold font-mono mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="t" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={34} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12 }}
              formatter={(v: number) => (isNum(v) ? v.toFixed(3) : "—")}
              labelFormatter={(l) => `порог ${Number(l).toFixed(2)}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {lines.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={LINE_META[k].label}
                stroke={LINE_META[k].color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            <ReferenceLine x={shown} stroke="#6366f1" strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
