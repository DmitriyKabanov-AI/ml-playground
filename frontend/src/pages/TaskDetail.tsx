import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Await, Card, DataTable, PageHeader } from '@/components/ui';
import { CvBar, ImportanceBar, MetricBar, ConfusionMatrix, RocChart, SkillByHorizon } from '@/components/charts';
import { useTaskMetrics } from '@/data/hooks';
import type {
  Category, ModelRow, TaskMetrics, ClassificationReport, RegressionReport, WeatherReport,
} from '@/types';
import { asClassification, asRegression, asWeather } from '@/types';

const CATEGORY_META: Record<Category, { label: string; metric: string; higher: boolean }> = {
  classification: { label: 'Классификация', metric: 'f1_macro',   higher: true },
  regression:     { label: 'Регрессия',     metric: 'rmse',       higher: false },
  forecasting:    { label: 'Прогнозирование', metric: 'skill_avg', higher: true },
};

export default function TaskDetailPage() {
  const { task } = useParams<{ task: string }>();
  const q = useTaskMetrics(task);
  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-fg">
        <ArrowLeft size={14} /> Все задачи
      </Link>
      <Await q={q}>{(data) => <View data={data} />}</Await>
    </>
  );
}

function View({ data }: { data: TaskMetrics }) {
  const meta = CATEGORY_META[data.category];
  const key = meta.metric;

  const sorted = useMemo(() =>
    [...data.all_models]
      .filter((m) => typeof m.metrics[key] === 'number')
      .sort((a, b) => meta.higher
        ? (b.metrics[key] as number) - (a.metrics[key] as number)
        : (a.metrics[key] as number) - (b.metrics[key] as number)),
    [data, key, meta.higher]);

  const chart = sorted.map((m) => ({ name: m.name, value: m.metrics[key] as number }));

  return (
    <>
      <PageHeader
        title={data.task}
        subtitle={`${meta.label} · активная: ${data.active.name} (id ${data.active.id})`}
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"
              title={`Сравнение моделей · ${key}`}
              subtitle={meta.higher ? 'чем выше — тем лучше' : 'чем ниже — тем лучше'}>
          {chart.length === 0
            ? <div className="py-8 text-center text-sm text-muted">Метрика <code>{key}</code> отсутствует</div>
            : <MetricBar data={chart} higher={meta.higher} metricKey={key} />}
        </Card>
        <Card title="Активная модель" subtitle={`id ${data.active.id} · ${data.active.name}`}>
          <MetricList metrics={data.active.metrics} primaryKey={key} />
        </Card>
      </div>

      <CategoryExtras data={data} />

      <Card title="Метаданные активной модели" className="mt-4">
        <MetaTable meta={data.active.meta} />
      </Card>

      <Card title="Все модели задачи" className="mt-4">
        <DataTable
          rows={sorted}
          rowKey={(r) => String(r.id)}
          highlight={(r) => r.status === 'active'}
          columns={[
            { key: 'id',   header: 'id',     align: 'right', render: (r) => r.id },
            { key: 'name', header: 'Модель',                 render: (r) => r.name },
            { key: 'st',   header: 'Статус',                 render: (r) => <StatusBadge status={r.status} /> },
            { key: 'primary', header: key, align: 'right', render: (r) => <b>{fmtNum(r.metrics[key])}</b> },
            ...secondaryColumns(sorted, key).map((k) => ({
              key: k, header: k, align: 'right' as const,
              render: (r: ModelRow) => fmtNum(r.metrics[k]),
            })),
          ]}
        />
      </Card>
    </>
  );
}

function CategoryExtras({ data }: { data: TaskMetrics }) {
  const cls = asClassification(data.report);
  const reg = asRegression(data.report);
  const wx  = asWeather(data.report);
  if (cls) return <ClassificationExtras r={cls} />;
  if (reg) return <RegressionExtras r={reg} />;
  if (wx)  return <WeatherExtras r={wx} />;
  return (
    <Card className="mt-4" title="Расширенная аналитика недоступна"
          subtitle="API не вернул поле `report`">
      <div className="text-sm text-muted">Добавьте <code>report</code> в /api/tasks/{data.task}/metrics</div>
    </Card>
  );
}

/* ───────────────── Classification ───────────────── */
function ClassificationExtras({ r }: { r: ClassificationReport }) {
  const cv = r.cv ?? [];
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Confusion matrix" subtitle="Активная модель · тестовая выборка">
          <ConfusionMatrix matrix={r.confusion} classes={r.classes} />
        </Card>
        <Card title="ROC-кривые (One-vs-Rest)" className="lg:col-span-2"
              subtitle="Чем ближе к левому верхнему углу — тем лучше">
          {r.roc?.length ? <RocChart roc={r.roc} /> : <Empty />}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Важность признаков" subtitle="Permutation importance">
          <ImportanceBar data={r.importance} />
        </Card>
        <Card title="Кросс-валидация" subtitle={`${cv.length}-fold accuracy`}>
          {cv.length ? <CvBar folds={cv} /> : <Empty />}
        </Card>
      </div>
      {r.models?.length > 0 && (
        <Card title="Все модели: Accuracy vs F1">
          <div className="grid gap-4 lg:grid-cols-2">
            <MetricBar data={r.models.map((m) => ({ name: m.name, value: m.acc }))} higher metricKey="Accuracy" />
            <MetricBar data={r.models.map((m) => ({ name: m.name, value: m.f1 }))}  higher metricKey="F1" />
          </div>
        </Card>
      )}
    </div>
  );
}

/* ───────────────── Regression ───────────────── */
function RegressionExtras({ r }: { r: RegressionReport }) {
  const fi = r.feature_importance ?? {};
  const fiModels = Object.keys(fi);
  const bestModel = r.headline?.best_model ?? fiModels[0];
  const importance = bestModel && fi[bestModel] ? fi[bestModel] : [];

  const rd = r.residual_diagnostics ?? {};
  const rdEntries = Object.entries(rd).filter(([, v]) => typeof v === 'number') as [string, number][];

  return (
    <div className="mt-4 space-y-4">
      {r.headline?.verdict && (
        <Card title="Вердикт" subtitle={r.headline.best_model ? `лучшая модель: ${r.headline.best_model}` : ''}>
          <p className="text-sm leading-relaxed">{r.headline.verdict}</p>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {importance.length > 0 ? (
          <Card title="Важность признаков" subtitle={bestModel ? `модель: ${bestModel}` : ''}>
            <ImportanceBar data={importance} />
          </Card>
        ) : <Empty />}
        {rdEntries.length > 0 && (
          <Card title="Диагностика остатков" subtitle="Сводные метрики">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {rdEntries.map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line bg-card px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted">{k}</div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums">{v.toFixed(4)}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Forecasting (weather) ───────────────── */
function WeatherExtras({ r }: { r: WeatherReport }) {
  const bh = r.by_horizon ?? {};
  const horizons = Object.keys(bh).map(Number).sort((a, b) => a - b);
  const firstH = horizons.length ? String(horizons[0]) : null;
  const maeKeys = firstH ? Object.keys(bh[firstH] ?? {}).filter((k) => k.startsWith('mae_')) : [];
  const skillKeys = firstH ? Object.keys(bh[firstH] ?? {}).filter((k) => k.startsWith('skill_')) : [];

  const colors = ['#22d3ee', '#c084fc', '#fbbf24', '#fb7185', '#34d399'];
  const maeSeries = maeKeys.map((k, i) => ({
    name: k.replace(/^mae_/, '').replace(/_mean$/, ''),
    color: colors[i % colors.length],
    values: horizons.map((h) => bh[String(h)][k] ?? 0),
  }));
  const skillSeries = skillKeys.map((k, i) => ({
    name: k.replace(/^skill_/, '').replace(/_mean$/, ''),
    color: colors[i % colors.length],
    values: horizons.map((h) => bh[String(h)][k] ?? 0),
  }));

  const stations = r.stations ?? [];

  return (
    <div className="mt-4 space-y-4">
      {r.headline?.verdict && (
        <Card title="Вердикт" subtitle={r.headline.best_model ? `лучшая модель: ${r.headline.best_model}` : ''}>
          <p className="text-sm leading-relaxed">{r.headline.verdict}</p>
        </Card>
      )}

      {stations.length > 0 && (
        <Card title="Станции" subtitle="Сводные метрики по станциям">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="px-3 py-2 text-left font-medium">Станция</th>
                  <th className="px-3 py-2 text-left font-medium">Метка</th>
                  <th className="px-3 py-2 text-right font-medium">n_test</th>
                  <th className="px-3 py-2 text-left font-medium">Лучшая</th>
                  <th className="px-3 py-2 text-right font-medium">Hero</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s) => (
                  <tr key={String(s.station_id)} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{s.station_id}</td>
                    <td className="px-3 py-2">{s.label ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.n_test ?? '—'}</td>
                    <td className="px-3 py-2">{s.best_model ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {typeof s.hero_value === 'number' ? s.hero_value.toFixed(3) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {maeSeries.length > 0 && (
          <Card title="MAE по горизонтам" subtitle="Средние значения по всем станциям">
            <SkillByHorizon series={maeSeries} xLabels={horizons.map((h) => `+${h} д`)} />
          </Card>
        )}
        {skillSeries.length > 0 && (
          <Card title="Skill score по горизонтам" subtitle="Против persistence-бейзлайна">
            <SkillByHorizon series={skillSeries} xLabels={horizons.map((h) => `+${h} д`)} />
          </Card>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Helpers ───────────────── */
const Empty = () => <div className="py-8 text-center text-sm text-muted">Нет данных</div>;

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span className={'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
      (isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-line/60 text-muted')}>{status}</span>
  );
}

function MetricList({ metrics, primaryKey }: { metrics: Record<string, number>; primaryKey: string }) {
  const entries = Object.entries(metrics).sort(([a], [b]) =>
    a === primaryKey ? -1 : b === primaryKey ? 1 : a.localeCompare(b));
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className={k === primaryKey ? 'font-semibold text-accent' : 'text-muted'}>{k}</dt>
          <dd className="text-right tabular-nums">{fmtNum(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function MetaTable({ meta }: { meta: Record<string, unknown> }) {
  const entries = Object.entries(meta);
  if (!entries.length) return <div className="text-sm text-muted">—</div>;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="truncate font-mono text-xs">{formatMeta(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatMeta(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return v.length > 6 ? `[${v.length} items]` : v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const fmtNum = (v: unknown): string => (typeof v === 'number' ? v.toFixed(4) : '—');

function secondaryColumns(rows: ModelRow[], primaryKey: string): string[] {
  const seen = new Map<string, boolean>();
  rows.forEach((r) => Object.keys(r.metrics).forEach((k) => seen.set(k, true)));
  return [...seen.keys()].filter((k) => k !== primaryKey).slice(0, 4);
}