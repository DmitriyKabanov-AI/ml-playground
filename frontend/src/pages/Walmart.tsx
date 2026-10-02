import { useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CalendarDays, Percent, Scale, TrendingUp } from 'lucide-react';
import { Await, Card, DataTable, KpiCard, PageHeader, SelectField, Segmented } from '@/components/ui';
import { axisProps, useChartTheme } from '@/components/charts/theme';
import { useWalmart } from '@/data/hooks';
import { FORECAST_MODELS, runForecast, seasonality } from '@/ml/forecasting';
import { fmtCompact, fmtDay, fmtMoney } from '@/lib/format';
import type { WalmartDataset } from '@/types';

export default function WalmartPage() {
  const q = useWalmart();
  return <Await q={q}>{(ds) => <View ds={ds} />}</Await>;
}

interface Row {
  date: string;
  actual?: number;
  forecast?: number;
  lo?: number;
  span?: number;
  hi?: number;
  holiday: string | null;
}

function View({ ds }: { ds: WalmartDataset }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const [storeId, setStoreId] = useState(ds.stores[0].id);
  const [modelId, setModelId] = useState('fourier');
  const [h, setH] = useState(13);
  const store = ds.stores.find((s) => s.id === storeId) ?? ds.stores[0];

  const all = useMemo(() => FORECAST_MODELS.map((m) => ({ m, r: runForecast(store, m.id, h) })), [store, h]);
  const res = all.find((x) => x.m.id === modelId)!.r;
  const season = useMemo(() => seasonality(store), [store]);

  const rows: Row[] = useMemo(() => {
    const hist: Row[] = res.history.map((p) => ({ date: p.date, actual: p.actual, holiday: p.holiday }));
    hist[hist.length - 1].forecast = hist[hist.length - 1].actual; // «стык» линий
    const fut: Row[] = res.dates.map((d, i) => ({
      date: d, actual: res.actual[i], forecast: res.forecast[i], lo: res.lo[i], hi: res.hi[i], span: res.hi[i] - res.lo[i], holiday: res.holidays[i],
    }));
    return [...hist, ...fut];
  }, [res]);

  const vals = rows.flatMap((r) => [r.actual, r.lo, r.hi]).filter((v): v is number => v !== undefined);
  const domain: [number, number] = [Math.floor((Math.min(...vals) * 0.95) / 1e4) * 1e4, Math.ceil((Math.max(...vals) * 1.04) / 1e4) * 1e4];
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

  return (
    <>
      <PageHeader title="Walmart · прогноз продаж" subtitle="Отложенная выборка: последние H недель скрыты от модели, затем сравниваются с прогнозом.">
        <SelectField label="Магазин" value={storeId} onChange={setStoreId} options={ds.stores.map((s) => ({ value: s.id, label: s.name }))} />
        <SelectField label="Модель" value={modelId} onChange={setModelId} options={FORECAST_MODELS.map((m) => ({ value: m.id, label: m.name }))} />
        <Segmented value={h} onChange={setH} options={[4, 8, 13, 26].map((v) => ({ value: v, label: `${v} нед.` }))} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="WMAE" value={fmtMoney(res.wmae)} hint="праздничные недели × 5" icon={Scale} />
        <KpiCard label="MAPE" value={`${res.mape.toFixed(2)}%`} hint={`Смещение ${res.bias.toFixed(1)}%`} icon={Percent} />
        <KpiCard label="YoY (прогноз)" value={pct(res.yoyForecast)} hint={`Факт: ${pct(res.yoyActual)}`} icon={TrendingUp} />
        <KpiCard label="Покрытие 95% ДИ" value={`${res.coverage.toFixed(0)}%`} hint="доля фактов внутри интервала" icon={CalendarDays} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-3" title={`${store.name}: факт, прогноз и доверительный интервал`} subtitle="Пунктирные вертикали — праздничные недели">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={rows} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="date" tickFormatter={fmtDay} minTickGap={28} />
              <YAxis {...ax} domain={domain} allowDataOverflow tickFormatter={(v) => fmtCompact(v)} width={56} />
              <Tooltip content={<FTooltip />} />
              <Legend />
              {rows.filter((r) => r.holiday).map((r) => (
                <ReferenceLine key={r.date} x={r.date} stroke={t.warn} strokeDasharray="3 4" label={{ value: r.holiday!, position: 'top', fill: t.warn, fontSize: 10 }} />
              ))}
              <ReferenceLine x={res.dates[0]} stroke={t.axis} label={{ value: 'старт прогноза', position: 'insideTopRight', fill: t.axis, fontSize: 10 }} />
              <Area dataKey="lo" stackId="ci" stroke="none" fill="transparent" legendType="none" isAnimationActive={false} />
              <Area dataKey="span" stackId="ci" name="95% ДИ" stroke="none" fill={t.accent} fillOpacity={0.2} isAnimationActive={false} />
              <Line dataKey="actual" name="Факт" stroke={t.series[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="forecast" name="Прогноз" stroke={t.accent} strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Сезонность" subtitle="Индекс месяца к тренду (100 = норма)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={season.monthly}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="month" />
              <YAxis {...ax} domain={[80, 'auto']} />
              <Tooltip {...t.tooltip} formatter={(v: number) => v.toFixed(1)} />
              <ReferenceLine y={100} stroke={t.axis} strokeDasharray="4 4" />
              <Bar dataKey="index" name="Индекс" radius={[4, 4, 0, 0]}>
                {season.monthly.map((m) => <Cell key={m.month} fill={m.index >= 100 ? t.good : t.series[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Эффект праздников" subtitle="Недельные продажи vs соседние обычные недели, %">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={season.holidays}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="name" />
              <YAxis {...ax} unit="%" />
              <Tooltip {...t.tooltip} formatter={(v: number) => `${v.toFixed(1)}%`} />
              <ReferenceLine y={0} stroke={t.axis} />
              <Bar dataKey="uplift" name="Uplift" radius={[4, 4, 0, 0]}>
                {season.holidays.map((x) => <Cell key={x.name} fill={x.uplift >= 0 ? t.warn : t.bad} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Сравнение моделей" subtitle={`${store.name}, горизонт ${h} нед.`}>
          <DataTable
            rows={[...all].sort((a, b) => a.r.wmae - b.r.wmae)}
            rowKey={(x) => x.m.id}
            highlight={(x) => x.m.id === modelId}
            columns={[
              { key: 'n', header: 'Модель', render: (x) => x.m.name },
              { key: 'w', header: 'WMAE', align: 'right', render: (x) => fmtMoney(x.r.wmae) },
              { key: 'm', header: 'MAPE', align: 'right', render: (x) => `${x.r.mape.toFixed(1)}%` },
            ]}
          />
        </Card>

        <Card className="xl:col-span-3" title="Таблица прогноза">
          <DataTable
            rows={res.dates.map((d, i) => ({ d, i }))}
            rowKey={(r) => r.d}
            columns={[
              { key: 'd', header: 'Неделя', render: (r) => <>{r.d} {res.holidays[r.i] && <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-500">{res.holidays[r.i]}</span>}</> },
              { key: 'f', header: 'Прогноз', align: 'right', render: (r) => fmtMoney(res.forecast[r.i]) },
              { key: 'l', header: 'Нижняя', align: 'right', render: (r) => fmtMoney(res.lo[r.i]) },
              { key: 'h', header: 'Верхняя', align: 'right', render: (r) => fmtMoney(res.hi[r.i]) },
              { key: 'a', header: 'Факт', align: 'right', render: (r) => fmtMoney(res.actual[r.i]) },
              {
                key: 'e', header: 'Ошибка', align: 'right',
                render: (r) => {
                  const e = (res.forecast[r.i] / res.actual[r.i] - 1) * 100;
                  return <span className={Math.abs(e) < 5 ? 'text-emerald-500' : Math.abs(e) < 10 ? 'text-amber-500' : 'text-rose-500'}>{e.toFixed(1)}%</span>;
                },
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}

function FTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold">{r.date} {r.holiday && <span className="text-amber-500">· {r.holiday}</span>}</div>
      {r.actual !== undefined && <div>Факт: <b>{fmtMoney(r.actual)}</b></div>}
      {r.forecast !== undefined && r.lo !== undefined && <div>Прогноз: <b>{fmtMoney(r.forecast)}</b></div>}
      {r.lo !== undefined && r.hi !== undefined && <div className="text-muted">ДИ: {fmtMoney(r.lo)} – {fmtMoney(r.hi)}</div>}
    </div>
  );
}