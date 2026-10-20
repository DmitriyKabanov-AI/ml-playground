"use client";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SectionTitle, PALETTE } from "@/components/shared/reportUi";
import { BinaryModel } from "@/lib/data/reports";

const invisibleDot = () => <g />;

/** ROC и PR всех обученных моделей рядом; выбранная модель выделена толщиной. */
export function CurvesCard({
  models, selectedName, prevalence,
}: { models: BinaryModel[]; selectedName: string; prevalence: number }) {
  const trained = models.filter((m) => !m.is_baseline);

  const series = (kind: "roc" | "pr") =>
    trained.map((m, i) => ({
      name: `${m.name} · ${kind === "roc" ? "ROC" : "PR"}-AUC ${(kind === "roc" ? m.roc_auc : m.pr_auc).toFixed(3)}`,
      color: PALETTE[i % PALETTE.length],
      selected: m.name === selectedName,
      data:
        kind === "roc"
          ? m.curves.roc.fpr.map((x, k) => ({ x, y: m.curves.roc.tpr[k] }))
          : m.curves.pr.recall.map((x, k) => ({ x, y: m.curves.pr.precision[k] })),
    }));

  const panel = (kind: "roc" | "pr") => (
    <div>
      <p className="text-xs text-slate-500 mb-1">
        {kind === "roc" ? "ROC: TPR от FPR" : `PR: precision от recall (серая линия — prevalence ${(prevalence * 100).toFixed(3)}%)`}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" dataKey="x" domain={[0, 1]} tick={{ fontSize: 11 }}
                 label={{ value: kind === "roc" ? "FPR" : "recall", position: "insideBottomRight", fontSize: 10, offset: -2 }} />
          <YAxis type="number" dataKey="y" domain={[0, 1]} tick={{ fontSize: 11 }} width={34} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => Number(v).toFixed(3)} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {kind === "roc" && (
            <Scatter name="случайный" data={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} line={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} shape={invisibleDot} legendType="none" isAnimationActive={false} />
          )}
          {kind === "pr" && <ReferenceLine y={prevalence} stroke="#94a3b8" strokeDasharray="4 4" />}
          {series(kind).map((s) => (
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
  );

  return (
    <Card>
      <SectionTitle>ROC vs PR — почему на дисбалансе нужна вторая кривая</SectionTitle>
      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        {panel("roc")}
        {panel("pr")}
      </div>
    </Card>
  );
}
