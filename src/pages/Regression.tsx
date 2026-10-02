import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Activity, Percent, Ruler, Sigma } from 'lucide-react';
import { Await, Card, DataTable, KpiCard, PageHeader, Segmented } from '../components/ui';
import { axisProps, useChartTheme } from '../components/charts/theme';
import { useRegressionData } from '../data/hooks';
import { analyzeRegression } from '../ml/regression';
import type { RegressionDataset } from '../types';

export default function RegressionPage() {
  const q = useRegressionData();
  return <Await q={q}>{(ds) => <View ds={ds} />}</Await>;
}

function View({ ds }: { ds: RegressionDataset }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const an = useMemo(() => analyzeRegression(ds), [ds]);
  const bestId = useMemo(() => [...an.results].sort((a, b) => b.r2 - a.r2)[0].id, [an]);
  const [id, setId] = useState(bestId);
  const m = an.results.find((r) => r.id === id)!;

  const avp = an.yTest.map((v, i) => ({ x: v, y: m.yPred[i] }));
  const res = m.yPred.map((p, i) => ({ x: p, y: m.residuals[i] }));
  const lo = Math.min(...an.yTest, ...m.yPred);
  const hi = Math.max(...an.yTest, ...m.yPred);
  const imp = [...m.importance].sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Регрессия" subtitle={`Целевая переменная: ${ds.target}. Тест: ${an.yTest.length} наблюдений.`}>
        <Segmented value={id} onChange={setId} options={an.results.map((r) => ({ value: r.id, label: r.name.split(' (')[0] }))} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="R²" value={m.r2.toFixed(3)} icon={Sigma} />
        <KpiCard label="RMSE" value={m.rmse.toFixed(3)} icon={Activity} />
        <KpiCard label="MAE" value={m.mae.toFixed(3)} icon={Ruler} />
        <KpiCard label="MAPE" value={`${m.mape.toFixed(1)}%`} icon={Percent} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Actual vs Predicted" subtitle={m.name}>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 14, left: 0 }}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
              <XAxis {...ax} type="number" dataKey="x" name="Факт" domain={[Math.floor(lo), Math.ceil(hi)]} label={{ value: 'Факт', position: 'insideBottom', offset: -6, fill: t.axis, fontSize: 11 }} />
              <YAxis {...ax} type="number" dataKey="y" name="Прогноз" domain={[Math.floor(lo), Math.ceil(hi)]} />
              <ZAxis range={[30, 30]} />
              <Tooltip {...t.tooltip} formatter={(v: number) => v.toFixed(3)} cursor={{ strokeDasharray: '3 3' }} />
              <ReferenceLine segment={[{ x: Math.floor(lo), y: Math.floor(lo) }, { x: Math.ceil(hi), y: Math.ceil(hi) }]} stroke={t.good} strokeDasharray="5 5" />
              <Scatter data={avp} fill={t.accent} fillOpacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Остатки vs прогноз" subtitle="Облако без паттерна ≈ хорошая модель">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 14, left: 0 }}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
              <XAxis {...ax} type="number" dataKey="x" name="Прогноз" domain={['auto', 'auto']} />
              <YAxis {...ax} type="number" dataKey="y" name="Остаток" domain={['auto', 'auto']} />
              <ZAxis range={[30, 30]} />
              <Tooltip {...t.tooltip} formatter={(v: number) => v.toFixed(3)} />
              <ReferenceLine y={0} stroke={t.good} strokeDasharray="5 5" />
              <Scatter data={res} fill={t.series[1]} fillOpacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Гистограмма остатков">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={m.hist.map((h) => ({ x: h.mid.toFixed(2), count: h.count }))}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="x" interval={1} />
              <YAxis {...ax} />
              <Tooltip {...t.tooltip} />
              <Bar dataKey="count" name="Наблюдений" fill={t.series[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Feature importance" subtitle="Permutation: падение R² на тесте">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={imp} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis {...ax} type="number" />
              <YAxis {...ax} type="category" dataKey="feature" width={90} />
              <Tooltip {...t.tooltip} formatter={(v: number) => v.toFixed(3)} />
              <Bar dataKey="value" name="Δ R²" fill={t.accent} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Метрики всех моделей" className="xl:col-span-2">
          <DataTable
            rows={an.results}
            rowKey={(r) => r.id}
            highlight={(r) => r.id === bestId}
            columns={[
              { key: 'n', header: 'Модель', render: (r) => r.name },
              { key: 'r2', header: 'R²', align: 'right', render: (r) => r.r2.toFixed(3) },
              { key: 'rmse', header: 'RMSE', align: 'right', render: (r) => r.rmse.toFixed(3) },
              { key: 'mae', header: 'MAE', align: 'right', render: (r) => r.mae.toFixed(3) },
              { key: 'mape', header: 'MAPE', align: 'right', render: (r) => `${r.mape.toFixed(1)}%` },
            ]}
          />
        </Card>
      </div>
    </>
  );
}