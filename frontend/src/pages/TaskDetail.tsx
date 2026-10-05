import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { Await, Card, DataTable, PageHeader } from '@/components/ui';
import { axisProps, useChartTheme } from '@/components/charts/theme';
import { useTaskMetrics } from '@/data/hooks';
import type { Category, ModelRow, TaskMetrics } from '@/types';

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
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-fg"
      >
        <ArrowLeft size={14} /> Все задачи
      </Link>
      <Await q={q}>{(data) => <View data={data} />}</Await>
    </>
  );
}

function View({ data }: { data: TaskMetrics }) {
  const t = useChartTheme();
  const ax = axisProps(t);
  const meta = CATEGORY_META[data.category];
  const key = meta.metric;

  const sorted = useMemo(() => {
    return [...data.all_models]
      .filter((m) => typeof m.metrics[key] === 'number')
      .sort((a, b) =>
        meta.higher
          ? (b.metrics[key] as number) - (a.metrics[key] as number)
          : (a.metrics[key] as number) - (b.metrics[key] as number),
      );
  }, [data, key, meta.higher]);

  const chart = sorted.map((m) => ({
    name: m.name,
    value: m.metrics[key] as number,
    id: m.id,
  }));

  const bestValue = chart[0]?.value ?? 0;

  return (
    <>
      <PageHeader
        title={data.task}
        subtitle={`${meta.label} · активная модель: ${data.active.name} (id ${data.active.id})`}
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title={`Сравнение моделей по ${key}`}
              subtitle={meta.higher ? 'чем выше — тем лучше' : 'чем ниже — тем лучше'}>
          {chart.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              Метрика <code>{key}</code> отсутствует у всех моделей
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis {...ax} dataKey="name" interval={0} tick={{ fill: t.axis, fontSize: 10 }} />
                <YAxis {...ax} />
                <Tooltip
                  {...t.tooltip}
                  formatter={(v: number) => v.toFixed(4)}
                  labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chart.map((c) => (
                    <Cell
                      key={c.id}
                      fill={c.value === bestValue ? t.good : t.accent}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Активная модель" subtitle={`id ${data.active.id} · ${data.active.name}`}>
          <MetricList metrics={data.active.metrics} primaryKey={key} />
        </Card>
      </div>

      <Card title="Метаданные активной модели">
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
            {
              key: 'primary', header: key, align: 'right',
              render: (r) => <b>{fmtNum(r.metrics[key])}</b>,
            },
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

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={
        'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
        (isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-line/60 text-muted')
      }
    >
      {status}
    </span>
  );
}

function MetricList({ metrics, primaryKey }: { metrics: Record<string, number>; primaryKey: string }) {
  const entries = Object.entries(metrics).sort(([a], [b]) =>
    a === primaryKey ? -1 : b === primaryKey ? 1 : a.localeCompare(b),
  );
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

const fmtNum = (v: unknown): string =>
  typeof v === 'number' ? v.toFixed(4) : '—';

/** Выбирает до 4 «второстепенных» метрик, чтобы показать в таблице. */
function secondaryColumns(rows: ModelRow[], primaryKey: string): string[] {
  const seen = new Map<string, boolean>();
  rows.forEach((r) => Object.keys(r.metrics).forEach((k) => seen.set(k, true)));
  return [...seen.keys()]
    .filter((k) => k !== primaryKey)
    .slice(0, 4);
}