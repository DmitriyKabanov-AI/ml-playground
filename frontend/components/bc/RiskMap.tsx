"use client";
import { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { BCSample } from "@/lib/data/breastCancer";

function colorFor(p: number) {
  const r = Math.round(16 + p * (244 - 16));
  const g = Math.round(185 - p * (185 - 63));
  const b = Math.round(129 - p * (129 - 94));
  return `rgb(${r},${g},${b})`;
}

export function RiskMap({ samples, threshold }: { samples: BCSample[]; threshold: number }) {
  const [selected, setSelected] = useState<BCSample | null>(null);

  const data = samples.map((s, i) => ({
    id: i,
    x: s.features["mean radius"] ?? 0,
    y: s.features["mean texture"] ?? 0,
    p: s.proba?.malignant ?? (s.predicted === "malignant" ? 1 : 0),
    sample: s,
  }));

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Карта риска пациентов · mean radius × mean texture
        </h3>
        <span className="text-xs text-slate-500">n = {samples.length}</span>
      </div>
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis dataKey="x" type="number" tick={{ fontSize: 11 }} name="mean radius" />
            <YAxis dataKey="y" type="number" tick={{ fontSize: 11 }} name="mean texture" />
            <ZAxis range={[90, 90]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{ fontSize: 12, borderRadius: 12 }}
              formatter={(v: any, n: string) => (n === "p" ? `${(v * 100).toFixed(1)}%` : v)}
            />
            <Scatter
              data={data}
              onClick={(p: any) => setSelected(p.payload.sample)}
              shape={(props: any) => {
                const above = props.payload.p >= threshold;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={above ? 7 : 5}
                    fill={colorFor(props.payload.p)}
                    stroke={above ? "#1e293b" : "none"}
                    strokeWidth={above ? 1.5 : 0}
                    opacity={0.88}
                    style={{ cursor: "pointer" }}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> низкий риск
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> средний
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> высокий
        </span>
        <span className="ml-auto text-slate-500">Порог = {threshold.toFixed(3)}</span>
      </div>
      {selected && (
        <div className="mt-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-sm grid grid-cols-2 gap-2">
          <p>
            Mean Radius: <b>{selected.features["mean radius"]?.toFixed(2)}</b>
          </p>
          <p>
            Mean Texture: <b>{selected.features["mean texture"]?.toFixed(2)}</b>
          </p>
          <p>
            Mean Concavity: <b>{selected.features["mean concavity"]?.toFixed(3)}</b>
          </p>
          <p>
            P(malignant): <b>{((selected.proba?.malignant ?? 0) * 100).toFixed(1)}%</b>
          </p>
          <p className="col-span-2">
            Истинный: <b>{selected.true}</b> · Предсказан: <b>{selected.predicted}</b> ·{" "}
            <span className={selected.correct ? "text-emerald-500" : "text-rose-500"}>
              {selected.error_type === "fn"
                ? "FN — пропущен рак"
                : selected.error_type === "fp"
                ? "FP — ложная тревога"
                : "OK"}
            </span>
          </p>
        </div>
      )}
    </Card>
  );
}