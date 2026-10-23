"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/shared/reportUi";
import { BinaryModel } from "@/lib/data/reports";

type ExtendedModel = BinaryModel & {
  ap?: number;
  average_precision?: number;
  brier_score?: number;
  metrics?: { ap?: number; brier_score?: number };
};

/** Сравнение ranking-качества (AP) и вероятностной ошибки (Brier Score) по тестовой выборке. */
export function CurvesCard({ models, selectedName, prevalence }: {
  models: BinaryModel[]; selectedName: string; prevalence: number;
}) {
  const rows = (models as ExtendedModel[]).map((m) => ({
    model: m.name,
    ap: Number(m.ap ?? m.metrics?.ap ?? m.average_precision),
    brier: Number(m.brier_score ?? m.metrics?.brier_score),
    selected: m.name === selectedName,
    baseline: Boolean(m.is_baseline),
  })).filter((m) => Number.isFinite(m.ap) || Number.isFinite(m.brier));

  const chart = (kind: "ap" | "brier") => {
    const isAp = kind === "ap";
    const data = rows.filter((r) => Number.isFinite(isAp ? r.ap : r.brier));
    return (
      <section className="min-w-0 rounded-xl border border-border/70 bg-slate-500/[0.025] p-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">{isAp ? "Average Precision (AP)" : "Brier Score"}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {isAp ? `Качество ранжирования задержек · выше лучше · baseline ≈ prevalence ${(prevalence * 100).toFixed(2)}%` : "Ошибка вероятностного прогноза · ниже лучше; учитывает не только класс, но и уверенность модели"}
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">test</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 48, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
            <XAxis dataKey="model" interval={0} angle={-18} textAnchor="end" height={70} tick={{ fontSize: 10 }} />
            <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} width={42} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 10 }}
              formatter={(v: number) => Number(v).toFixed(5)}
              labelFormatter={(name) => String(name)}
            />
            {isAp && <ReferenceLine y={prevalence} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: "prevalence", position: "insideTopLeft", fill: "#f59e0b", fontSize: 10 }} />}
            <Bar dataKey={isAp ? "ap" : "brier"} name={isAp ? "AP" : "Brier Score"} radius={[5, 5, 0, 0]}>
              {data.map((row) => <Cell key={row.model} fill={row.selected ? "#22d3ee" : row.baseline ? "#94a3b8" : "#818cf8"} fillOpacity={row.selected ? 1 : 0.82} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm bg-cyan-400" /> выбранная модель</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm bg-indigo-400" /> обученные модели</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm bg-slate-400" /> baseline</span>
        </div>
      </section>
    );
  };

  return (
    <Card>
      <SectionTitle>Качество ранжирования и вероятностей</SectionTitle>
      <p className="mt-1 text-xs text-slate-500">AP и Brier Score — threshold-independent метрики: они помогают сравнить модели независимо от выбранной границы классификации.</p>
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        {chart("ap")}
        {chart("brier")}
      </div>
    </Card>
  );
}
