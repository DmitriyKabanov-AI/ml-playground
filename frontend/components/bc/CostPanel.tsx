"use client";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { BCReport, countsFromSweep } from "@/lib/data/breastCancer";

export function CostPanel({ report }: { report: BCReport }) {
  const [costFP, setCostFP] = useState(100);
  const [costFN, setCostFN] = useState(500);

  const optimal = useMemo(() => {
    let bestT = 0.5;
    let bestCost = Infinity;
    let bestCounts: any = null;
    for (const t of report.threshold_sweep.thresholds) {
      const c = countsFromSweep(report, t);
      const cost = c.fp * costFP + c.fn * costFN;
      if (cost < bestCost) {
        bestCost = cost;
        bestT = t;
        bestCounts = c;
      }
    }
    return { t: bestT, cost: bestCost, counts: bestCounts };
  }, [report, costFP, costFN]);

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
        Калькулятор стоимости ошибок
      </h3>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <label className="text-sm">
          <span className="text-slate-500 text-xs">Цена FP</span>
          <input
            type="number"
            value={costFP}
            onChange={(e) => setCostFP(+e.target.value)}
            className="w-full mt-1 bg-slate-500/10 rounded-lg px-3 py-2 outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500 text-xs">Цена FN</span>
          <input
            type="number"
            value={costFN}
            onChange={(e) => setCostFN(+e.target.value)}
            className="w-full mt-1 bg-slate-500/10 rounded-lg px-3 py-2 outline-none"
          />
        </label>
      </div>
      <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20">
        <p className="text-xs text-slate-500">Оптимальный порог по стоимости</p>
        <p className="text-3xl font-black text-indigo-500">{optimal.t.toFixed(3)}</p>
        <p className="text-sm mt-2">
          Ожидаемая стоимость:{" "}
          <b>{Math.round(optimal.cost).toLocaleString("ru-RU")} ₽</b>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          FP: {optimal.counts?.fp} · FN: {optimal.counts?.fn}
        </p>
      </div>
    </Card>
  );
}