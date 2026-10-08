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

/** Ищет ключ признака по нескольким вариантам написания.
 *  Возвращает первое найденное значение или null. */
function pickFeature(
  features: Record<string, number> | undefined,
  ...candidates: string[]
): { key: string; value: number } | null {
  if (!features) return null;
  // 1. точное совпадение
  for (const c of candidates) {
    if (features[c] !== undefined) return { key: c, value: features[c] };
  }
  // 2. нормализованное совпадение (mean_radius == mean radius == meanRadius)
  const norm = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "");
  for (const c of candidates) {
    const target = norm(c);
    const found = Object.keys(features).find((k) => norm(k) === target);
    if (found !== undefined) return { key: found, value: features[found] };
  }
  return null;
}

export function RiskMap({ samples, threshold }: { samples: BCSample[]; threshold: number }) {
  const [selected, setSelected] = useState<BCSample | null>(null);

  const data = samples.map((s, i) => {
    const radius = pickFeature(s.features, "mean radius", "mean_radius");
    const texture = pickFeature(s.features, "mean texture", "mean_texture");
    return {
      id: i,
      x: radius?.value ?? 0,
      y: texture?.value ?? 0,
      p: s.proba?.malignant ?? (s.predicted === "malignant" ? 1 : 0),
      sample: s,
    };
  });

  const selectedRadius = selected
    ? pickFeature(selected.features, "mean radius", "mean_radius")
    : null;
  const selectedTexture = selected
    ? pickFeature(selected.features, "mean texture", "mean_texture")
    : null;
  const selectedConcavity = selected
    ? pickFeature(selected.features, "mean concavity", "mean_concavity")
    : null;

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
              formatter={(v: any, n: string) =>
                n === "p" ? `${(Number(v) * 100).toFixed(1)}%` : Number(v).toFixed(2)
              }
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
            Mean Radius: <b>{selectedRadius?.value?.toFixed(2) ?? "—"}</b>
          </p>
          <p>
            Mean Texture: <b>{selectedTexture?.value?.toFixed(2) ?? "—"}</b>
          </p>
          <p>
            Mean Concavity: <b>{selectedConcavity?.value?.toFixed(3) ?? "—"}</b>
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