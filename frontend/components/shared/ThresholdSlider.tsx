"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { useMemo } from "react";
import { ThresholdPoint } from "@/lib/types";

export function ThresholdSlider({ sweep, threshold, onChange, costFP, costFN }:{
  sweep: ThresholdPoint[]; threshold: number; onChange: (v: number) => void;
  costFP?: number; costFN?: number;
}) {
  const current = useMemo(() => {
    if (!sweep.length) return null;
    return sweep.reduce((best, p) => Math.abs(p.threshold - threshold) < Math.abs(best.threshold - threshold) ? p : best, sweep[0]);
  }, [sweep, threshold]);

  if (!current) return null;
  const cost = costFP !== undefined && costFN !== undefined ? current.fp * costFP + current.fn * costFN : null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Порог решения</CardTitle>
        <span className="text-lg font-bold text-primary-500">{threshold.toFixed(2)}</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={threshold}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full mt-4 accent-indigo-500 h-2 rounded-full cursor-pointer" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5">
        {([["Precision", current.precision],["Recall", current.recall],["F1", current.f1],
           ["F0.5", current.f05],["F2", current.f2],["MCC", current.mcc]] as const).map(([label, val]) => (
          <div key={label} className="text-center">
            <p className="text-[10px] text-slate-500 uppercase">{label}</p>
            <p className="font-bold text-sm">{Number(val).toFixed(3)}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 text-sm">
        <span className="text-rose-500 font-semibold">FP: {current.fp}</span>
        <span className="text-amber-500 font-semibold">FN: {current.fn}</span>
        {cost !== null && <span className="ml-auto font-bold">Стоимость: {cost.toLocaleString()} ₽</span>}
      </div>
    </Card>
  );
}
