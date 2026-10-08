"use client";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { BCReport, countsFromSweep } from "@/lib/data/breastCancer";

export function CostPanel({ report }: { report: BCReport }) {
  const [costFP, setCostFP] = useState(100);
  const [costFN, setCostFN] = useState(500);

  const curve = useMemo(() => {
    return report.threshold_sweep.thresholds.map((t) => {
      const c = countsFromSweep(report, t);
      return {
        threshold: +t.toFixed(3),
        cost: c.fp * costFP + c.fn * costFN,
        fp: c.fp,
        fn: c.fn,
      };
    });
  }, [report, costFP, costFN]);

  const optimal = useMemo(() => {
    if (!curve.length) return null;
    return curve.reduce(
      (best, p) => (p.cost < best.cost ? p : best),
      curve[0]
    );
  }, [curve]);

  if (!optimal) return null;

  const hi = Math.max(1, ...curve.map((c) => c.cost));
  const yMax = hi * 1.05;

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Калькулятор стоимости ошибок
      </h3>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <label className="text-sm">
          <span className="text-slate-500 text-xs">
            Цена FP · ложная тревога
          </span>
          <input
            type="number"
            min={0}
            value={costFP}
            onChange={(e) => setCostFP(Math.max(0, +e.target.value || 0))}
            className="w-full mt-1 bg-slate-500/10 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500 text-xs">Цена FN · пропуск</span>
          <input
            type="number"
            min={0}
            value={costFN}
            onChange={(e) => setCostFN(Math.max(0, +e.target.value || 0))}
            className="w-full mt-1 bg-slate-500/10 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </label>
      </div>

      <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-slate-500">
              Оптимальный порог по стоимости
            </p>
            <p className="text-3xl font-black text-indigo-500">
              {optimal.threshold.toFixed(3)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Ожидаемая стоимость</p>
            <p className="text-xl font-bold">
              {Math.round(optimal.cost).toLocaleString("ru-RU")} ₽
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          FP: {optimal.fp} × {costFP.toLocaleString("ru-RU")}₽ · FN: {optimal.fn} ×{" "}
          {costFN.toLocaleString("ru-RU")}₽
        </p>
      </div>

      <div className="mt-5">
        <p className="text-xs text-slate-500 mb-2">
          Стоимость vs порог решения
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={curve}
            margin={{ top: 10, right: 15, left: -5, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis
              dataKey="threshold"
              type="number"
              domain={[0, 1]}
              tick={{ fontSize: 11 }}
              label={{
                value: "threshold",
                position: "insideBottom",
                fontSize: 10,
                dy: 8,
              }}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`
              }
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12 }}
              formatter={(v: number) =>
                `${Math.round(v).toLocaleString("ru-RU")} ₽`
              }
              labelFormatter={(l) => `threshold = ${l}`}
            />
            <ReferenceLine
              x={optimal.threshold}
              stroke="#6366f1"
              strokeDasharray="4 4"
            />
            <ReferenceDot
              x={optimal.threshold}
              y={optimal.cost}
              r={5}
              fill="#6366f1"
              stroke="#fff"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}