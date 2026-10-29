"use client";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
  BarChart, Bar, Cell, LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SectionTitle, PALETTE } from "@/components/shared/reportUi";
import { BinaryModel } from "@/lib/data/reports";
import { finite, getAp, shortName, stepPoints } from "@/lib/data/binaryMetrics";

const invisibleDot = () => <g />;

/**
 * Average Precision: ступенчатые PR-кривые обученных моделей (AP в легенде)
 * и столбики AP всех моделей с линией «ничего не знающего» предиктора (AP = prevalence).
 */
export function AveragePrecisionCard({
  models, selectedName, prevalence,
}: { models: BinaryModel[]; selectedName: string; prevalence: number }) {
  const trained = models.filter((m) => !m.is_baseline);

  const series = trained.map((m, i) => ({
    name: `${m.name} · AP ${getAp(m).toFixed(3)}`,
    color: PALETTE[i % PALETTE.length],
    selected: m.name === selectedName,
    data: stepPoints(m.curves.pr.recall, m.curves.pr.precision),
  }));

  const bars = [...models]
    .sort((a, b) => Number(a.is_baseline) - Number(b.is_baseline) || getAp(b) - getAp(a))
    .map((m) => ({
      name: shortName(m.name),
      ap: getAp(m),
      baseline: m.is_baseline,
      selected: m.name === selectedName,
      color: PALETTE[Math.max(0, trained.findIndex((t) => t.name === m.name)) % PALETTE.length],
    }));

  const sel = models.find((m) => m.name === selectedName);
  const selAp = sel ? getAp(sel) : NaN;
  const lift = finite(selAp) && prevalence > 0 ? selAp / prevalence : NaN;

  return (
    <Card>
      <SectionTitle>Average Precision (AP) — качество ранжирования на дисбалансе</SectionTitle>
      <p className="text-xs text-slate-500 mt-2 max-w-3xl leading-relaxed">
        AP = Σ (Rₙ − Rₙ₋₁) · Pₙ — средняя precision по всем уровням recall. Считается только по положительному классу,
        поэтому не раздувается огромным числом верно отпущенных рейсов (как ROC-AUC). Случайная модель даёт AP = prevalence
        ({(prevalence * 100).toFixed(1)}%), а не 0.5.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">
            Precision–Recall (ступенчатая, серая линия — prevalence {(prevalence * 100).toFixed(1)}%)
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ left: 0, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" dataKey="x" domain={[0, 1]} tick={{ fontSize: 11 }}
                     label={{ value: "recall", position: "insideBottomRight", fontSize: 10, offset: -2 }} />
              <YAxis type="number" dataKey="y" domain={[0, 1]} tick={{ fontSize: 11 }} width={34} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => Number(v).toFixed(3)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={prevalence} stroke="#94a3b8" strokeDasharray="4 4" />
              {series.map((s) => (
                <Scatter
                  key={s.name}
                  name={s.name}
                  data={s.data}
                  line={{ stroke: s.color, strokeWidth: s.selected ? 3.5 : 1.5, strokeOpacity: s.selected ? 1 : 0.6 }}
                  shape={invisibleDot}
                  legendType="line"
                  fill={s.color}
                  isAnimationActive={false}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1">
            AP по моделям (пунктир — baseline без модели, AP = prevalence)
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bars} margin={{ left: 0, right: 8, top: 18 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis
                domain={[0, (max: number) => Math.min(1, Math.ceil(max * 1.2 * 20) / 20)]}
                tick={{ fontSize: 11 }}
                width={34}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => Number(v).toFixed(4)} />
              <ReferenceLine y={prevalence} stroke="#94a3b8" strokeDasharray="4 4" />
              <Bar dataKey="ap" name="AP" radius={[6, 6, 0, 0]}>
                {bars.map((b) => (
                  <Cell
                    key={b.name}
                    fill={b.baseline ? "#94a3b8" : b.color}
                    fillOpacity={b.selected ? 1 : 0.55}
                    stroke={b.selected ? "#6366f1" : "none"}
                    strokeWidth={b.selected ? 2 : 0}
                  />
                ))}
                <LabelList
                  dataKey="ap"
                  position="top"
                  fontSize={10}
                  formatter={(v: number) => (finite(v) ? v.toFixed(3) : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-3">
        {sel ? (
          <>
            <b>{sel.name}</b>: AP {finite(selAp) ? selAp.toFixed(4) : "—"}
            {finite(lift) && <> — в <b className="font-mono">{lift.toFixed(2)}×</b> выше случайного уровня (prevalence)</>}.
          </>
        ) : null}{" "}
        Чем выше AP, тем раньше в списке по убыванию риска идут реальные задержки.
      </p>
    </Card>
  );
}
