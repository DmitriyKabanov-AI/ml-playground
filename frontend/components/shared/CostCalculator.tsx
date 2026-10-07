"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { useMemo, useState } from "react";
import { ThresholdPoint } from "@/lib/types";

export function CostCalculator({ sweep }: { sweep: ThresholdPoint[] }) {
  const [costFP, setCostFP] = useState(100);
  const [costFN, setCostFN] = useState(500);
  const optimal = useMemo(() => {
    if (!sweep.length) return null;
    return sweep.reduce((best, p) => {
      const c = p.fp * costFP + p.fn * costFN;
      const bc = best.fp * costFP + best.fn * costFN;
      return c < bc ? p : best;
    }, sweep[0]);
  }, [sweep, costFP, costFN]);

  if (!optimal) return null;
  return (
    <Card>
      <CardTitle>Калькулятор стоимости ошибок</CardTitle>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <label className="text-sm">
          <span className="text-slate-500 text-xs">Цена FP</span>
          <input type="number" value={costFP} onChange={(e) => setCostFP(+e.target.value)}
            className="w-full mt-1 bg-slate-500/10 rounded-lg px-3 py-2 outline-none" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500 text-xs">Цена FN</span>
          <input type="number" value={costFN} onChange={(e) => setCostFN(+e.target.value)}
            className="w-full mt-1 bg-slate-500/10 rounded-lg px-3 py-2 outline-none" />
        </label>
      </div>
      <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-violet-500/10 border border-primary-500/20">
        <p className="text-xs text-slate-500">Оптимальный порог</p>
        <p className="text-3xl font-black text-primary-500">{optimal.threshold.toFixed(2)}</p>
        <p className="text-sm mt-2">Стоимость: <b>{(optimal.fp * costFP + optimal.fn * costFN).toLocaleString()} ₽</b></p>
        <p className="text-xs text-slate-500 mt-1">FP: {optimal.fp} · FN: {optimal.fn}</p>
      </div>
    </Card>
  );
}
