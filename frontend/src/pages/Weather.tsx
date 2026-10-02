import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CloudRain, Droplets, Gauge, Thermometer, Wind, Target, Zap, type LucideIcon } from 'lucide-react';
import { Await, Card, KpiCard, PageHeader, SelectField, Segmented } from '@/components/ui';
import { axisProps, useChartTheme } from '@/components/charts/theme';
import { useWeather } from '@/data/hooks';
import { analyzeWeather, HORIZON } from '@/ml/forecasting';
import { addDays, fmtDay, fmtWeekday } from '@/lib/format';
import { mean } from '@/lib/stats';
import type { WeatherDataset } from '@/types';

const ICONS: Record<string, LucideIcon> = { temp: Thermometer, humidity: Droplets, pressure: Gauge, wind: Wind, precip: CloudRain };

export default function WeatherPage() {
  const q = useWeather();
  return <Await q={q}>{(ds) => <View ds={ds} />}</Await>;
}

function View({ ds }: { ds: WeatherDataset }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const an = useMemo(() => analyzeWeather(ds), [ds]);
  const [city, setCity] = useState(ds.cities[0].name);
  const [vkey, setVkey] = useState(ds.variables[0].key);
  const [modelId, setModelId] = useState('ridge');

  const c = ds.cities.find((x) => x.name === city) ?? ds.cities[0];
  const v = ds.variables.find((x) => x.key === vkey) ?? ds.variables[0];
  const ev = an[c.name][v.key];
  const m = ev.models.find((x) => x.id === modelId)!;
  const pers = ev.models[0];
  const N = c.series[v.key].length;
  const Icon = ICONS[v.key] ?? Thermometer;
  const d = v.decimals;
  const nonNeg = v.key === 'precip' || v.key === 'wind' || v.key === 'humidity';

  const backtest = ev.actual.map((a, i) => ({
    date: addDays(c.startDate, N - 14 + i), actual: a, model: m.lead1[i], persistence: pers.lead1[i],
  }));
  const horizons = Array.from({ length: HORIZON }, (_, k) => {
    const row: Record<string, number | string> = { h: `+${k + 1}д` };
    ev.models.forEach((x) => (row[x.id] = x.rmse[k]));
    return row;
  });
  const skillRows = Array.from({ length: HORIZON }, (_, k) => {
    const row: Record<string, number | string> = { h: `+${k + 1}д` };
    ev.models.slice(1).forEach((x) => (row[x.id] = x.skill[k]));
    return row;
  });
  const meanSkill = mean(m.skill);

  return (
    <>
      <PageHeader title="Погода · бэктест и прогноз" subtitle="Бэктест на последних 14 днях (обучение закончено до окна) и прогноз на 7 дней вперёд.">
        <Segmented value={city} onChange={setCity} options={ds.cities.map((x) => ({ value: x.name, label: x.name }))} />
        <SelectField label="Переменная" value={vkey} onChange={setVkey} options={ds.variables.map((x) => ({ value: x.key, label: `${x.label}, ${x.unit}` }))} />
        <SelectField label="Модель" value={modelId} onChange={setModelId} options={ev.models.map((x) => ({ value: x.id, label: x.name }))} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="RMSE, +1 день" value={`${m.rmse[0].toFixed(2)} ${v.unit}`} icon={Icon} />
        <KpiCard label="MAE, +1 день" value={`${m.mae[0].toFixed(2)} ${v.unit}`} icon={Target} />
        <KpiCard label="RMSE, +7 дней" value={`${m.rmse[6].toFixed(2)} ${v.unit}`} icon={Icon} />
        <KpiCard label="Средний skill vs persistence" value={`${(meanSkill * 100).toFixed(0)}%`} hint="1 − RMSE / RMSE_persistence" icon={Zap} />
      </div>

      <Card className="mt-4" title="Прогноз на 7 дней" subtitle="Интервал ≈ 80%, оценён по бэктест-RMSE соответствующего горизонта">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {m.forecast.map((val, k) => {
            const date = addDays(c.startDate, N + k);
            const s = 1.28 * m.rmse[k];
            const lo = nonNeg ? Math.max(0, val - s) : val - s;
            return (
              <div key={date} className="rounded-xl border border-line bg-surface/60 p-3 text-center">
                <div className="text-xs font-medium capitalize text-muted">{fmtWeekday(date)}, {fmtDay(date)}</div>
                <Icon className="mx-auto my-2 text-accent" size={22} />
                <div className="text-xl font-semibold tabular-nums">{val.toFixed(d)}<span className="ml-0.5 text-xs text-muted">{v.unit}</span></div>
                <div className="mt-1 text-[11px] tabular-nums text-muted">{lo.toFixed(d)} … {(val + s).toFixed(d)}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Бэктест 14 дней (горизонт +1 день)" subtitle={`${c.name} · ${v.label}`} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={backtest} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="date" tickFormatter={fmtDay} />
              <YAxis {...ax} domain={['auto', 'auto']} unit={` ${v.unit}`} width={64} />
              <Tooltip {...t.tooltip} labelFormatter={fmtDay} formatter={(x: number) => x.toFixed(d)} />
              <Legend />
              <Line dataKey="actual" name="Факт" stroke={t.series[1]} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              <Line dataKey="model" name={m.name} stroke={t.accent} strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              <Line dataKey="persistence" name="Persistence" stroke={t.axis} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Ошибка по горизонту (RMSE)" subtitle="Чем ниже, тем лучше">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={horizons}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="h" />
              <YAxis {...ax} />
              <Tooltip {...t.tooltip} formatter={(x: number) => x.toFixed(2)} />
              <Legend />
              {ev.models.map((x, i) => (
                <Line key={x.id} dataKey={x.id} name={x.name.split(' (')[0]} stroke={t.series[i]} strokeWidth={x.id === modelId ? 3 : 1.5} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Skill score vs persistence" subtitle=">0 — модель лучше «завтра как сегодня»">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={skillRows}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="h" />
              <YAxis {...ax} tickFormatter={(x) => `${(x * 100).toFixed(0)}%`} />
              <Tooltip {...t.tooltip} formatter={(x: number) => `${(x * 100).toFixed(1)}%`} />
              <Legend />
              <ReferenceLine y={0} stroke={t.axis} />
              {ev.models.slice(1).map((x, i) => (
                <Bar key={x.id} dataKey={x.id} name={x.name.split(' (')[0]} fill={t.series[i + 1]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}