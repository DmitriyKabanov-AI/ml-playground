import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { axisProps, useChartTheme } from './theme';

const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/* ───────────────────────── Model comparison bar ───────────────────────── */
export function MetricBar({
  data, higher = true, metricKey,
}: { data: { name: string; value: number }[]; higher?: boolean; metricKey: string }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const best = useMemo(() => {
    if (!data.length) return undefined;
    return data.reduce((b, x) => (higher ? (x.value > b.value ? x : b) : (x.value < b.value ? x : b)));
  }, [data, higher]);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 44, left: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis {...ax} dataKey="name" interval={0} tick={{ fill: t.axis, fontSize: 10 }} angle={-20} textAnchor="end" height={54} />
        <YAxis {...ax} />
        <Tooltip {...t.tooltip} formatter={(v: number) => fmt(v)} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''} />
        <Bar dataKey="value" name={metricKey} radius={[4, 4, 0, 0]}>
          {data.map((c, i) => (
            <Cell key={i} fill={best && c.name === best.name ? t.good : t.accent} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Confusion matrix ───────────────────────────── */
export function ConfusionMatrix({ matrix, classes }: { matrix: number[][]; classes: string[] }) {
  const K = classes.length;
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="space-y-3">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `90px repeat(${K}, minmax(0,1fr))` }}>
        <div />
        {classes.map((c) => (
          <div key={c} className="text-center text-[11px] font-semibold text-muted">{c}</div>
        ))}
        {matrix.map((row, i) => (
          <div key={i} className="contents">
            <div className="flex items-center justify-end pr-2 text-[11px] font-semibold text-muted">{classes[i]}</div>
            {row.map((v, j) => {
              const a = v / max;
              const bg = i === j
                ? `rgba(52,211,153,${0.10 + a * 0.55})`
                : `rgba(251,113,133,${0.08 + a * 0.55})`;
              return (
                <div
                  key={j}
                  className="grid h-16 place-items-center rounded-xl border border-line text-lg font-bold tabular-nums"
                  style={{ background: bg, color: v === 0 ? 'rgb(var(--muted))' : 'rgb(var(--fg))' }}
                  title={`факт: ${classes[i]} → предсказано: ${classes[j]} · ${v}`}
                >
                  {v}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-center text-[11px] text-muted">↓ факт · → предсказание</div>
    </div>
  );
}

/* ───────────────────────── ROC curves ────────────────────────────────── */
export function RocChart({ roc }: { roc: { cls: string; auc: number; fpr: number[]; tpr: number[] }[] }) {
  const t = useChartTheme();
  const colors = [t.classes[0], t.classes[1], t.classes[2], t.series[3], t.series[4]];
  const data = roc.map((r, k) => ({
    id: r.cls,
    color: colors[k % colors.length],
    label: `${r.cls} (AUC ${fmt(r.auc, 3)})`,
    points: r.fpr.map((x, i) => ({ x, y: r.tpr[i] })),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" domain={[0, 1]} {...axisProps(t)} label={{ value: 'FPR', position: 'insideBottom', offset: -4, fill: t.axis, fontSize: 11 }} />
        <YAxis type="number" dataKey="y" domain={[0, 1]} {...axisProps(t)} label={{ value: 'TPR', angle: -90, position: 'insideLeft', fill: t.axis, fontSize: 11 }} />
        <Tooltip {...t.tooltip} formatter={(v: number) => fmt(v, 3)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={t.axis} strokeDasharray="4 4" />
        {data.map((d) => (
          <Line key={d.id} data={d.points} dataKey="y" name={d.label} stroke={d.color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Feature importance ────────────────────────── */
export function ImportanceBar({ data, color }: { data: { name: string; value: number }[]; color?: string }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const palette = [t.accent, t.classes[0], t.classes[1], t.classes[2], t.series[4], t.series[5]];
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 34)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 24, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...ax} />
        <YAxis type="category" dataKey="name" width={130} {...ax} tick={{ fill: t.axis, fontSize: 11 }} />
        <Tooltip {...t.tooltip} formatter={(v: number) => fmt(v)} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={color ?? palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── CV folds ─────────────────────────────────── */
export function CvBar({ folds }: { folds: number[] }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const avg = folds.reduce((s, v) => s + v, 0) / (folds.length || 1);
  const data = folds.map((v, i) => ({ name: `Fold ${i + 1}`, value: v, mean: avg }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis {...ax} dataKey="name" />
        <YAxis {...ax} domain={[Math.max(0, Math.min(...folds) - 0.05), Math.min(1, Math.max(...folds) + 0.05)]} />
        <Tooltip {...t.tooltip} formatter={(v: number) => fmt(v)} />
        <Bar dataKey="value" fill={t.good} radius={[4, 4, 0, 0]} />
        <ReferenceLine y={avg} stroke={t.warn} strokeDasharray="5 4" label={{ value: `μ ${fmt(avg, 3)}`, fill: t.warn, fontSize: 11, position: 'right' }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Actual vs Predicted ───────────────────────── */
export function AvpScatter({ actual, predicted }: { actual: number[]; predicted: number[] }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const pts = actual.map((v, i) => ({ x: v, y: predicted[i] }));
  const all = [...actual, ...predicted];
  const lo = Math.min(...all), hi = Math.max(...all);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" domain={[lo, hi]} {...ax} name="Actual" label={{ value: 'Actual', position: 'insideBottom', offset: -12, fill: t.axis, fontSize: 11 }} />
        <YAxis type="number" dataKey="y" domain={[lo, hi]} {...ax} name="Predicted" label={{ value: 'Predicted', angle: -90, position: 'insideLeft', fill: t.axis, fontSize: 11 }} />
        <Tooltip {...t.tooltip} formatter={(v: number) => fmt(v)} />
        <ReferenceLine segment={[{ x: lo, y: lo }, { x: hi, y: hi }]} stroke={t.warn} strokeDasharray="5 4" />
        <Scatter data={pts} fill={t.classes[0]} fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Residuals vs Predicted ────────────────────── */
export function ResidualsScatter({ actual, predicted }: { actual: number[]; predicted: number[] }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const res = actual.map((v, i) => v - predicted[i]);
  const pts = predicted.map((v, i) => ({ x: v, y: res[i] }));
  const lo = Math.min(...predicted), hi = Math.max(...predicted);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" domain={[lo, hi]} {...ax} label={{ value: 'Predicted', position: 'insideBottom', offset: -12, fill: t.axis, fontSize: 11 }} />
        <YAxis type="number" dataKey="y" {...ax} label={{ value: 'Residual', angle: -90, position: 'insideLeft', fill: t.axis, fontSize: 11 }} />
        <Tooltip {...t.tooltip} formatter={(v: number) => fmt(v)} />
        <ReferenceLine y={0} stroke={t.bad} strokeDasharray="5 4" />
        <Scatter data={pts} fill={t.series[5]} fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Histogram ─────────────────────────────────── */
export function Histogram({ values, bins = 18 }: { values: number[]; bins?: number }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const lo = Math.min(...values), hi = Math.max(...values);
  const w = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  values.forEach((v) => { counts[Math.min(bins - 1, Math.floor((v - lo) / w))]++; });
  const data = counts.map((count, i) => ({ mid: lo + (i + 0.5) * w, count }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis {...ax} dataKey="mid" tickFormatter={(v: number) => v.toFixed(1)} />
        <YAxis {...ax} />
        <Tooltip {...t.tooltip} formatter={(v: number) => v} />
        <Bar dataKey="count" fill={t.accent} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Forecast line + CI ────────────────────────── */
export function ForecastLine({
  labels, actual, forecast, lo, hi, unit,
}: {
  labels: string[];
  actual: (number | null)[];
  forecast: (number | null)[];
  lo?: (number | null)[];
  hi?: (number | null)[];
  unit?: string;
}) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const data = labels.map((l, i) => ({
    label: l,
    actual: actual[i],
    forecast: forecast[i],
    lo: lo?.[i] ?? null,
    hi: hi?.[i] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
        <XAxis {...ax} dataKey="label" tick={{ fill: t.axis, fontSize: 10 }} minTickGap={24} />
        <YAxis {...ax} tickFormatter={(v: number) => (unit ? `${v.toFixed(0)}${unit}` : v.toFixed(0))} />
        <Tooltip
          {...t.tooltip}
          formatter={(v: number, name: string) => (v == null ? '—' : `${v.toFixed(2)}${unit ?? ''}`)}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="actual" name="Факт" stroke={t.dark ? '#e2e8f5' : '#0f172a'} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="forecast" name="Прогноз" stroke={t.classes[0]} strokeWidth={2.4} dot={false} isAnimationActive={false} />
        {lo && <Line type="monotone" dataKey="lo" name="lower" stroke="transparent" dot={false} isAnimationActive={false} legendType="none" />}
        {hi && <Line type="monotone" dataKey="hi" name="95% интервал" stroke="transparent" dot={false} isAnimationActive={false} />}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ───────────────────────── Multi-line skill by horizon ───────────────── */
export function SkillByHorizon({
  series, xLabels,
}: { series: { name: string; color: string; values: number[] }[]; xLabels: (string | number)[] }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const data = xLabels.map((l, i) => {
    const row: Record<string, number | string> = { label: l };
    series.forEach((s) => { row[s.name] = s.values[i] ?? 0; });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
        <XAxis {...ax} dataKey="label" />
        <YAxis {...ax} />
        <Tooltip {...t.tooltip} formatter={(v: number) => fmt(v, 3)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}