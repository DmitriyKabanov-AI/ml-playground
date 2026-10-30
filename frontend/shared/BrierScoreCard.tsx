"use client";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
  BarChart, Bar, Cell, LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { SectionTitle, PALETTE } from "@/components/shared/reportUi";
import { BinaryModel } from "@/lib/data/reports";
import {
  brierNoSkill, brierSkill, finite, getBrier, getCalibration, shortName,
} from "@/lib/data/binaryMetrics";

const invisibleDot = () => <g />;

/**
 * Brier Score = средний квадрат ошибки вероятности (p − y)²; ниже — лучше.
 * Слева — Brier всех моделей против «ничего не знающего» предиктора p(1−p),
 * справа — диаграмма калибровки выбранной модели (предсказанная vs фактическая доля задержек).
 */
export function BrierScoreCard({
  models, selectedName, prevalence,
}: { models: BinaryModel[]; selectedName: string; prevalence: number }) {
  const trained = models.filter((m) => !m.is_baseline);
  const ref = brierNoSkill(prevalence);

  const bars = [...models]
    .filter((m) => finite(getBrier(m)))
    .sort((a, b) => Number(a.is_baseline) - Number(b.is_baseline) || getBrier(a) - getBrier(b))
    .map((m) => ({
      name: shortName(m.name),
      brier: getBrier(m),
      baseline: m.is_baseline,
      selected: m.name === selectedName,
      color: PALETTE[Math.max(0, trained.findIndex((t) => t.name === m.name)) % PALETTE.length],
    }));

  const sel = models.find((m) => m.name === selectedName);
  const selBrier = sel ? getBrier(sel) : NaN;
  const bss = brierSkill(selBrier, prevalence);
  const cal = sel ? getCalibration(sel) : null;
  const calPoints = cal
    ? cal.mean_pred.map((x, i) => ({ x, y: cal.obs_rate[i], n: cal.n[i] })).filter((p) => finite(p.x) && finite(p.y))
    : [];
  const selColor = PALETTE[Math.max(0, trained.findIndex((t) => t.name === selectedName)) % PALETTE.length];

  if (!bars.length) {
    return (
      <Card>
        <SectionTitle>Brier Score — качество вероятностей</SectionTitle>
        <p className="text-sm text-slate-500 mt-3">
          В report.json нет поля <code>brier</code>. Перезапустите ноутбук 02_flight_delays_cost — он сохранит Brier Score и
          диаграмму калибровки.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>Brier Score — качество вероятностей</SectionTitle>
      <p className="text-xs text-slate-500 mt-2 max-w-3xl leading-relaxed">
        Brier = среднее (p − y)², где p — предсказанная вероятность задержки, y — факт (0/1). Метрика не зависит от порога и
        штрафует и плохое ранжирование, и плохую калибровку. Ориентир — предиктор, всегда выдающий prevalence: Brier = p(1−p) ={" "}
        <b className="font-mono">{ref.toFixed(4)}</b>. Меньше — лучше.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Brier по моделям (серая линия — ориентир p(1−p))</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bars} margin={{ left: 0, right: 8, top: 18 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis
                domain={[0, (max: number) => Math.max(Math.ceil(max * 1.15 * 20) / 20, ref * 1.2)]}
                tick={{ fontSize: 11 }}
                width={40}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => Number(v).toFixed(4)} />
              <ReferenceLine
                y={ref}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: "no-skill", fontSize: 10, fill: "#94a3b8", position: "insideTopRight" }}
              />
              <Bar dataKey="brier" name="Brier" radius={[6, 6, 0, 0]}>
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
                  dataKey="brier"
                  position="top"
                  fontSize={10}
                  formatter={(v: number) => (finite(v) ? v.toFixed(4) : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1">
            Калибровка · {sel?.name ?? "—"} (на диагонали — вероятности честные)
          </p>
          {calPoints.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" dataKey="x" domain={[0, 1]} tick={{ fontSize: 11 }}
                       label={{ value: "предсказанная вероятность", position: "insideBottomRight", fontSize: 10, offset: -2 }} />
                <YAxis type="number" dataKey="y" domain={[0, 1]} tick={{ fontSize: 11 }} width={34} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12 }}
                  formatter={(v: number, name: string) => [Number(v).toFixed(3), name === "x" ? "предсказано" : "фактически"]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Scatter
                  name="идеальная калибровка"
                  data={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                  line={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
                  shape={invisibleDot}
                  legendType="none"
                  isAnimationActive={false}
                />
                <Scatter
                  name={sel?.name ?? "модель"}
                  data={calPoints}
                  line={{ stroke: selColor, strokeWidth: 2.5 }}
                  fill={selColor}
                  legendType="line"
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 mt-6">
              Для этой модели диаграмма калибровки недоступна (baseline выдаёт константу или в report.json нет{" "}
              <code>calibration</code>).
            </p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-3">
        {sel && finite(selBrier) ? (
          <>
            <b>{sel.name}</b>: Brier <b className="font-mono">{selBrier.toFixed(4)}</b>
            {finite(bss) && (
              <>
                {" "}· Brier Skill Score <b className="font-mono">{bss.toFixed(3)}</b>{" "}
                ({bss > 0 ? "лучше" : "хуже"} ориентира p(1−p))
              </>
            )}
            .{" "}
          </>
        ) : null}
        Диаграмма калибровки строится по 10 равным интервалам score на тестовой выборке.
      </p>
    </Card>
  );
}
