"use client";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { BCReport, BCSweep, countsFromSweep } from "@/lib/data/breastCancer";

const fmtMoney = (v: number) =>
  Number.isFinite(v) ? Math.round(v).toLocaleString("ru-RU") + " ₽" : "—";

export function CostPanel({
  report,
  sweep,                          // ← sweep выбранной модели (если есть)
  currentThreshold,
  onApplyThreshold,
}: {
  report: BCReport;
  sweep?: BCSweep | any;          // ← per-model sweep с фронта
  currentThreshold?: number;
  onApplyThreshold?: (t: number) => void;
}) {
  // FIX: дефолт осмысленный — FN в медицинском скрининге стоит на порядок дороже FP.
  const [costFP, setCostFP] = useState(100);
  const [costFN, setCostFN] = useState(5000);

  const curve = useMemo(() => {
    const effectiveSweep = sweep ?? report.threshold_sweep;
    const thresholds = effectiveSweep?.thresholds ?? [];
    return thresholds
      .map((t: number) => {
        const c = countsFromSweep(report, t, effectiveSweep);
        const cost = c.fp * costFP + c.fn * costFN;
        return {
          threshold: +Number(t).toFixed(3),
          cost: Number.isFinite(cost) ? cost : 0,
          fp: c.fp,
          fn: c.fn,
        };
      })
      .filter((p: any) => Number.isFinite(p.threshold) && Number.isFinite(p.cost));
  }, [report, costFP, costFN, sweep]);

  const optimal = useMemo(() => {
    if (!curve.length) return null;
    return curve.reduce((best, p) => (p.cost < best.cost ? p : best), curve[0]);
  }, [curve]);

  // стоимость на текущем пороге пользователя
  const current = useMemo(() => {
    if (!curve.length || currentThreshold === undefined) return null;
    return curve.reduce(
      (best, p) =>
        Math.abs(p.threshold - currentThreshold) <
        Math.abs(best.threshold - currentThreshold)
          ? p
          : best,
      curve[0]
    );
  }, [curve, currentThreshold]);

  if (!optimal) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Калькулятор стоимости ошибок
        </h3>
        <p className="text-sm text-slate-500 mt-3">
          Недостаточно данных threshold_sweep для расчёта стоимости.
        </p>
      </Card>
    );
  }

  const hi = Math.max(1, ...curve.map((c) => c.cost));
  const yMax = hi * 1.05;

  const currentCost = current?.cost ?? optimal.cost;
  const savings = currentCost - optimal.cost;
  const isOptimal = current
    ? Math.abs(current.threshold - optimal.threshold) < 1e-6
    : false;

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
          Калькулятор стоимости ошибок
        </h3>
        <span className="text-xs text-slate-500">
          FP = {costFP.toLocaleString("ru-RU")}₽ · FN ={" "}
          {costFN.toLocaleString("ru-RU")}₽
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <label className="text-sm">
          <span className="text-slate-500 text-xs">Цена FP · ложная тревога</span>
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

      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {/* Оптимум по стоимости */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
          <p className="text-xs text-slate-500">Оптимум по стоимости</p>
          <p className="text-3xl font-black text-indigo-500">
            {optimal.threshold.toFixed(3)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            FP: {optimal.fp} · FN: {optimal.fn}
          </p>
          <p className="text-sm font-bold mt-1">{fmtMoney(optimal.cost)}</p>
          {onApplyThreshold && !isOptimal && (
            <button
              onClick={() => onApplyThreshold(optimal.threshold)}
              className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors font-medium"
            >
              Применить ↑ к слайдеру
            </button>
          )}
          {isOptimal && (
            <p className="mt-2 text-xs text-emerald-500 font-semibold">
              ✓ Совпадает с текущим порогом
            </p>
          )}
        </div>

        {/* Стоимость на текущем пороге */}
        {current && (
          <div
            className={`p-4 rounded-xl border ${
              isOptimal
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/30"
            }`}
          >
            <p className="text-xs text-slate-500">Текущий порог</p>
            <p
              className={`text-3xl font-black ${
                isOptimal ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {current.threshold.toFixed(3)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              FP: {current.fp} · FN: {current.fn}
            </p>
            <p className="text-sm font-bold mt-1">{fmtMoney(currentCost)}</p>
            {!isOptimal && savings > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Потенциал экономии: <b>−{fmtMoney(savings)}</b>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="text-xs text-slate-500 mb-2">
          Стоимость vs порог решения
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={curve}
            margin={{ top: 15, right: 15, left: -5, bottom: 20 }}
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
                offset: -8,
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
              formatter={(v: number) => fmtMoney(Number(v))}
              labelFormatter={(l) => `threshold = ${l}`}
            />

            {/* Метка оптимума */}
            <ReferenceLine
              x={optimal.threshold}
              stroke="#6366f1"
              strokeDasharray="4 4"
              label={{
                value: "оптимум",
                fontSize: 10,
                fill: "#6366f1",
                position: "top",
              }}
            />
            <ReferenceDot
              x={optimal.threshold}
              y={optimal.cost}
              r={5}
              fill="#6366f1"
              stroke="#fff"
              strokeWidth={2}
            />

            {/* Метка текущего порога — не дублируем, если совпадает с оптимумом */}
            {current && !isOptimal && (
              <ReferenceLine
                x={current.threshold}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: "текущий",
                  fontSize: 10,
                  fill: "#f59e0b",
                  position: "top",
                }}
              />
            )}
            {current && !isOptimal && (
              <ReferenceDot
                x={current.threshold}
                y={current.cost}
                r={4}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={2}
              />
            )}

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