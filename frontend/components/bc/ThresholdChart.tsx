"use client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { BCSweep } from "@/lib/data/breastCancer";

export function ThresholdChart({
  sweep,
  current,
  hero,
}: {
  sweep: BCSweep;
  current: number;
  hero: "f0.5_pos" | "f2_pos";
}) {
  const safe = (v: any): number => (Number.isFinite(v) ? v : 0);

  const data = (sweep.thresholds ?? []).map((t, i) => ({
    threshold: +safe(t).toFixed(3),
    precision: safe(sweep.precision_pos?.[i]),
    recall: safe(sweep.recall_pos?.[i]),
    f05: safe(sweep["f0.5_pos"]?.[i]),
    f2: safe(sweep.f2_pos?.[i]),
  }));

  const heroKey = hero === "f0.5_pos" ? "f05" : "f2";
  const heroLabel = hero === "f0.5_pos" ? "F0.5 (malignant)" : "F2 (malignant)";

  // Авто-масштаб Y по данным, с фильтрацией NaN/null
  const values = data
    .flatMap((d) => [d.precision, d.recall, d[heroKey as "f05" | "f2"]])
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 1);

  let yMin = 0;
  let yMax = 1;
  if (values.length) {
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const span = Math.max(0.05, dataMax - dataMin);
    yMin = Math.max(0, dataMin - span * 0.08);
    yMax = Math.min(1, dataMax + span * 0.05);
    if (yMax - yMin < 0.05) {
      yMin = Math.max(0, yMin - 0.025);
      yMax = Math.min(1, yMax + 0.025);
    }
  }

  if (!data.length) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Threshold sweep
        </h3>
        <p className="text-sm text-slate-500 mt-3">
          В артефакте нет данных threshold_sweep.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Threshold sweep
        </h3>
        <span className="text-xs text-slate-500">
          sweep source: {sweep.sweep_source ?? "validation"} · Y ∈ [
          {yMin.toFixed(3)}, {yMax.toFixed(3)}]
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis
            dataKey="threshold"
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12 }}
            formatter={(v: number) => Number(v).toFixed(3)}
            labelFormatter={(l) => `threshold = ${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            x={current}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{
              value: `thr=${current.toFixed(3)}`,
              fontSize: 10,
              position: "top",
            }}
          />
          <Line
            type="monotone"
            dataKey="precision"
            name="Precision (malignant)"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="recall"
            name="Recall (malignant)"
            stroke="#0891b2"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey={heroKey}
            name={heroLabel}
            stroke="#d97706"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}