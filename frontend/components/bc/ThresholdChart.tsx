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
  const data = sweep.thresholds.map((t, i) => ({
    threshold: +t.toFixed(3),
    precision: sweep.precision_pos[i],
    recall: sweep.recall_pos[i],
    f05: sweep["f0.5_pos"]?.[i] ?? 0,
    f2: sweep.f2_pos?.[i] ?? 0,
  }));

  const heroKey = hero === "f0.5_pos" ? "f05" : "f2";
  const heroLabel = hero === "f0.5_pos" ? "F0.5 (malignant)" : "F2 (malignant)";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Threshold sweep
        </h3>
        <span className="text-xs text-slate-500">
          sweep source: {sweep.sweep_source ?? "validation"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey="threshold" type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            x={current}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: `thr=${current.toFixed(3)}`, fontSize: 10, position: "top" }}
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