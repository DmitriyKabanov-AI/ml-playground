"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useMemo, useState } from "react";
import { ProbabilityRadar } from "./ProbabilityRadar";
import { IrisScatterMap } from "./IrisScatterMap";
import { IrisPoint, predictIris } from "@/lib/data/iris";

const SLIDERS = [
  { key: "sl", label: "Длина чашелистика (sepal length)", min: 4,   max: 8,   step: 0.1, def: 5.8 },
  { key: "sw", label: "Ширина чашелистика (sepal width)",  min: 2,   max: 4.5, step: 0.1, def: 3.0 },
  { key: "pl", label: "Длина лепестка (petal length)",     min: 1,   max: 7,   step: 0.1, def: 4.0 },
  { key: "pw", label: "Ширина лепестка (petal width)",     min: 0.1, max: 2.6, step: 0.1, def: 1.2 },
] as const;

const COLORS: Record<string, string> = { setosa: "#10b981", versicolor: "#6366f1", virginica: "#f43f5e" };

export function IrisLiveSimulator({ data }: { data: IrisPoint[] }) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(SLIDERS.map((s) => [s.key, s.def]))
  );
  const { probs, predicted } = useMemo(
    () => predictIris(values.sl, values.sw, values.pl, values.pw, data),
    [values, data]
  );

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-stretch">
      <Card className="flex flex-col">
        <div className="flex items-center justify-between">
          <CardTitle>Live-симулятор цветка</CardTitle>
          <Badge tone="info" className="capitalize">{predicted}</Badge>
        </div>

        <div className="flex-1 flex flex-col justify-between gap-6 mt-6">
          <div className="space-y-6">
            {SLIDERS.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{s.label}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {values[s.key].toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={values[s.key]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [s.key]: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-indigo-500 h-2 rounded-full cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Object.entries(probs).map(([cls, p]) => (
              <div
                key={cls}
                className="text-center p-4 rounded-xl"
                style={{ background: `${COLORS[cls]}14` }}
              >
                <p className="text-xs capitalize text-slate-500">{cls}</p>
                <p className="font-bold text-lg" style={{ color: COLORS[cls] }}>
                  {(p * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        <ProbabilityRadar probs={probs} />
        <IrisScatterMap data={data} current={{ x: values.pl, y: values.pw }} />
      </div>
    </div>
  );
}