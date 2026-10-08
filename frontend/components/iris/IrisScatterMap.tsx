"use client";
import { Card, CardTitle } from "@/components/ui/Card";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useState } from "react";
import { IrisPoint } from "@/lib/data/iris";

const FEATURES = ["sepalLength", "sepalWidth", "petalLength", "petalWidth"] as const;
const COLORS: Record<string, string> = { setosa: "#10b981", versicolor: "#6366f1", virginica: "#f43f5e" };
const LABELS: Record<string, string> = {
  sepalLength: "Длина чашелистика",
  sepalWidth: "Ширина чашелистика",
  petalLength: "Длина лепестка",
  petalWidth: "Ширина лепестка",
};

export function IrisScatterMap({ data, current }: { data: IrisPoint[]; current?: { x: number; y: number } }) {
  const [xAxis, setXAxis] = useState<typeof FEATURES[number]>("petalLength");
  const [yAxis, setYAxis] = useState<typeof FEATURES[number]>("petalWidth");

  const selectClass =
    "bg-slate-500/10 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 " +
    "border border-border outline-none cursor-pointer " +
    "[color-scheme:light] dark:[color-scheme:dark]";

  const optionClass =
    "bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100";

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <CardTitle>Карта поля ирисов</CardTitle>
        <div className="flex gap-2 text-xs">
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value as any)}
            className={selectClass}
          >
            {FEATURES.map((f) => (
              <option key={f} value={f} className={optionClass}>
                {LABELS[f]}
              </option>
            ))}
          </select>
          <select
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value as any)}
            className={selectClass}
          >
            {FEATURES.map((f) => (
              <option key={f} value={f} className={optionClass}>
                {LABELS[f]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey={xAxis} type="number" name={LABELS[xAxis]} tick={{ fontSize: 11 }} />
          <YAxis dataKey={yAxis} type="number" name={LABELS[yAxis]} tick={{ fontSize: 11 }} />
          <ZAxis range={[60, 60]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ fontSize: 12, borderRadius: 12 }} />
          <Scatter data={data} shape={(props: any) => {
            const correct = props.payload.actual === props.payload.predicted;
            return (
              <circle cx={props.cx} cy={props.cy} r={5}
                fill={COLORS[props.payload.actual]}
                stroke={correct ? "none" : "#fff"} strokeWidth={correct ? 0 : 2}
                opacity={0.85} />
            );
          }} />
          {current && (
            <Scatter data={[{ [xAxis]: current.x, [yAxis]: current.y }]}
              shape={(props: any) => (
                <g>
                  <circle cx={props.cx} cy={props.cy} r={10} fill="none" stroke="#fbbf24" strokeWidth={2.5} />
                  <circle cx={props.cx} cy={props.cy} r={4} fill="#fbbf24" />
                </g>
              )} />
          )}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs">
        {Object.entries(COLORS).map(([cls, color]) => (
          <div key={cls} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {cls}
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-amber-400" /> текущий образец
        </div>
      </div>
    </Card>
  );
}