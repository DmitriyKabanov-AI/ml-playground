import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ErrorBar, Legend, Line, LineChart, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Crosshair, Gauge, Layers, Target } from 'lucide-react';
import { Await, Card, DataTable, KpiCard, PageHeader, SelectField, SliderField } from '../components/ui';
import { axisProps, useChartTheme } from '../components/charts/theme';
import { useIris } from '../data/hooks';
import { analyzeClassification, type ModelResult } from '../ml/classification';
import { fmtPct } from '../lib/format';
import { argmax, mean } from '../lib/stats';
import type { IrisDataset } from '../types';

export default function ClassificationPage() {
  const q = useIris();
  return <Await q={q}>{(ds) => <View ds={ds} />}</Await>;
}

function View({ ds }: { ds: IrisDataset }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const an = useMemo(() => analyzeClassification(ds), [ds]);
  const best = useMemo(() => [...an.results].sort((a, b) => b.accuracy - a.accuracy)[0], [an]);
  const [modelId, setModelId] = useState(best.id);
  const [fx, setFx] = useState(2);
  const [fy, setFy] = useState(3);
  const m = an.results.find((r) => r.id === modelId)!;

  const wrong = useMemo(
    () => an.testIdx.filter((idx, k) => m.yPred[k] !== ds.y[idx]),
    [an, m, ds],
  );
  const featOpts = ds.featureNames.map((f, i) => ({ value: i, label: f }));
  const point = (i: number) => ({ x: ds.X[i][fx], y: ds.X[i][fy], i });

  return (
    <>
      <PageHeader title="Классификация · Iris" subtitle={`Тест: ${an.testIdx.length} образцов (стратифицированный сплит 70/30). Все метрики посчитаны в браузере.`}>
        <SelectField label="Модель" value={modelId} onChange={setModelId} options={an.results.map((r) => ({ value: r.id, label: r.name }))} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Accuracy (test)" value={fmtPct(m.accuracy)} hint={`Ошибок: ${wrong.length}`} icon={Target} />
        <KpiCard label="F1 macro" value={m.f1.toFixed(3)} hint={`P ${m.precision.toFixed(3)} · R ${m.recall.toFixed(3)}`} icon={Layers} />
        <KpiCard label="ROC AUC (OvR)" value={m.aucMacro.toFixed(3)} icon={Gauge} />
        <KpiCard label="CV 5-fold" value={fmtPct(m.cvMean)} hint={`± ${(m.cvStd * 100).toFixed(1)} п.п.`} icon={Crosshair} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Признаковое пространство"
          subtitle="Крестики — ошибки модели на тестовой выборке"
          actions={
            <div className="flex gap-2">
              <SelectField label="Ось X" value={fx} onChange={setFx} options={featOpts} />
              <SelectField label="Ось Y" value={fy} onChange={setFy} options={featOpts} />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
              <XAxis {...ax} type="number" dataKey="x" name={ds.featureNames[fx]} domain={['auto', 'auto']} />
              <YAxis {...ax} type="number" dataKey="y" name={ds.featureNames[fy]} domain={['auto', 'auto']} />
              <ZAxis range={[46, 46]} />
              <Tooltip {...t.tooltip} cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              {ds.classNames.map((c, ci) => (
                <Scatter key={c} name={c} data={ds.y.map((_, i) => i).filter((i) => ds.y[i] === ci).map(point)} fill={t.classes[ci]} fillOpacity={0.75} />
              ))}
              <Scatter name="Ошибки модели" data={wrong.map(point)} shape="cross" fill={t.bad} stroke={t.bad} legendType="cross" />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Confusion matrix" subtitle="Строки — истинный класс, столбцы — предсказанный">
          <ConfusionMatrix m={m} classes={ds.classNames} />
        </Card>

        <Card title="ROC-кривые (one-vs-rest)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
              <XAxis {...ax} type="number" dataKey="fpr" domain={[0, 1]} label={{ value: 'FPR', position: 'insideBottom', offset: -4, fill: t.axis, fontSize: 11 }} />
              <YAxis {...ax} type="number" domain={[0, 1]} />
              <Tooltip {...t.tooltip} formatter={(v: number) => v.toFixed(3)} />
              <Legend />
              <Line data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} dataKey="tpr" name="Случайно" stroke={t.axis} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              {m.roc.map((r) => (
                <Line key={r.cls} data={r.points} dataKey="tpr" name={`${ds.classNames[r.cls]} (AUC ${r.auc.toFixed(3)})`} stroke={t.classes[r.cls]} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Сравнение моделей" subtitle="Тестовая выборка">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={an.results.map((r) => ({ name: r.name.split(' ')[0], Accuracy: r.accuracy, F1: r.f1, AUC: r.aucMacro }))}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="name" />
              <YAxis {...ax} domain={[0.7, 1]} />
              <Tooltip {...t.tooltip} formatter={(v: number) => v.toFixed(3)} />
              <Legend />
              <Bar dataKey="Accuracy" fill={t.series[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="F1" fill={t.series[1]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="AUC" fill={t.series[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Permutation importance" subtitle="Падение accuracy при перемешивании признака">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={m.importance} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis {...ax} type="number" />
              <YAxis {...ax} type="category" dataKey="feature" width={95} />
              <Tooltip {...t.tooltip} formatter={(v: number) => v.toFixed(3)} />
              <Bar dataKey="mean" name="Δ accuracy" fill={t.accent} radius={[0, 4, 4, 0]}>
                <ErrorBar dataKey="std" stroke={t.axis} width={4} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Кросс-валидация (5-fold)" subtitle="Среднее ± std по всем данным">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={an.results.map((r) => ({ name: r.name.split(' ')[0], mean: r.cvMean, err: r.cvStd }))}>
              <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis {...ax} dataKey="name" />
              <YAxis {...ax} domain={[0.8, 1]} />
              <Tooltip {...t.tooltip} formatter={(v: number) => v.toFixed(3)} />
              <Bar dataKey="mean" name="CV accuracy" fill={t.series[3]} radius={[4, 4, 0, 0]}>
                <ErrorBar dataKey="err" stroke={t.axis} width={4} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Live-предиктор" subtitle={`Модель: ${m.name}, обучена на всех данных`} className="xl:col-span-2">
          <LivePredictor ds={ds} model={m} />
        </Card>

        <Card title="Сводка по моделям">
          <DataTable
            rows={an.results}
            rowKey={(r) => r.id}
            highlight={(r) => r.id === best.id}
            columns={[
              { key: 'n', header: 'Модель', render: (r) => r.name },
              { key: 'a', header: 'Acc', align: 'right', render: (r) => fmtPct(r.accuracy) },
              { key: 'f', header: 'F1', align: 'right', render: (r) => r.f1.toFixed(3) },
              { key: 'c', header: 'CV', align: 'right', render: (r) => fmtPct(r.cvMean) },
            ]}
          />
        </Card>
      </div>
    </>
  );
}

function ConfusionMatrix({ m, classes }: { m: ModelResult; classes: string[] }) {
  const max = Math.max(...m.cm.flat(), 1);
  return (
    <div className="grid gap-1 text-center text-xs" style={{ gridTemplateColumns: `auto repeat(${classes.length}, 1fr)` }}>
      <div />
      {classes.map((c) => <div key={c} className="pb-1 text-muted">{c}</div>)}
      {m.cm.map((row, i) => (
        <div key={i} className="contents">
          <div className="flex items-center pr-2 text-right text-muted">{classes[i]}</div>
          {row.map((v, j) => (
            <div
              key={j}
              className="grid aspect-square place-items-center rounded-lg text-lg font-semibold tabular-nums"
              style={{
                background: i === j ? `rgba(52,211,153,${0.1 + (0.7 * v) / max})` : v ? `rgba(251,113,133,${0.25 + (0.6 * v) / max})` : 'rgb(var(--line) / .35)',
              }}
            >
              {v}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LivePredictor({ ds, model }: { ds: IrisDataset; model: ModelResult }) {
  const t = useChartTheme();
  const ranges = useMemo(
    () => ds.featureNames.map((_, j) => {
      const col = ds.X.map((r) => r[j]);
      return { min: Math.floor(Math.min(...col) * 10) / 10, max: Math.ceil(Math.max(...col) * 10) / 10, avg: mean(col) };
    }),
    [ds],
  );
  const [vals, setVals] = useState(() => ranges.map((r) => +r.avg.toFixed(1)));
  const probs = model.predictor(vals);
  const cls = argmax(probs);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        {ds.featureNames.map((f, j) => (
          <SliderField key={f} label={f} min={ranges[j].min} max={ranges[j].max} value={vals[j]} onChange={(v) => setVals((p) => p.map((x, i) => (i === j ? v : x)))} />
        ))}
      </div>
      <div>
        <div className="mb-3 text-sm text-muted">
          Предсказание: <span className="rounded-full px-3 py-1 text-sm font-semibold text-black" style={{ background: t.classes[cls] }}>{ds.classNames[cls]}</span>
        </div>
        <div className="space-y-3">
          {ds.classNames.map((c, i) => (
            <div key={c}>
              <div className="mb-1 flex justify-between text-xs"><span>{c}</span><span className="tabular-nums">{fmtPct(probs[i])}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-line/60">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${probs[i] * 100}%`, background: t.classes[i] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}