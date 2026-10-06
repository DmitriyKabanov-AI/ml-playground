import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTaskMetrics } from '../data/hooks'
import { Loader } from '../components/ui/Loader'
import { ErrorState } from '../components/ui/ErrorState'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { MetricBar } from '../components/charts/MetricBar'
import { CATEGORY_LABELS, METRIC_DIRECTION, METRIC_LABELS, PRIMARY_METRIC, formatMetricValue, taskLabel } from '../lib/category'
import ClassificationView from './classification/ClassificationView'
import RegressionView from './regression/RegressionView'
import ForecastingView from './forecasting/ForecastingView'
import type { ModelRow, TaskMetrics } from '../types'

export default function TaskDetail() {
  const { task } = useParams<{ task: string }>()
  const { data, isLoading, isError, refetch } = useTaskMetrics(task)

  if (isLoading) return <Loader text="Загрузка метрик..." />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const primaryMetric = PRIMARY_METRIC[data.category]
  const direction = METRIC_DIRECTION[primaryMetric] ?? 'up'

  const barData = data.all_models.map((m) => ({
    name: m.name,
    value: m.metrics[primaryMetric] ?? 0,
  }))

  const secondaryMetrics = Object.keys(data.active.metrics).filter((k) => k !== primaryMetric).slice(0, 4)

  const columns: DataTableColumn<ModelRow>[] = [
    { key: 'name', header: 'Модель', sortable: true, accessor: (r) => r.name },
    {
      key: 'status',
      header: 'Статус',
      render: (r) => <Badge tone={r.status === 'active' ? 'success' : 'neutral'}>{r.status}</Badge>,
    },
    {
      key: primaryMetric,
      header: METRIC_LABELS[primaryMetric] ?? primaryMetric,
      sortable: true,
      accessor: (r) => r.metrics[primaryMetric] ?? 0,
      render: (r) => formatMetricValue(primaryMetric, r.metrics[primaryMetric] ?? 0),
      align: 'right',
    },
    ...secondaryMetrics.map(
      (key): DataTableColumn<ModelRow> => ({
        key,
        header: METRIC_LABELS[key] ?? key,
        sortable: true,
        accessor: (r) => r.metrics[key] ?? 0,
        render: (r) => (r.metrics[key] !== undefined ? formatMetricValue(key, r.metrics[key]) : '—'),
        align: 'right',
      }),
    ),
  ]

  return (
    <div>
      <PageHeader
        title={taskLabel(data.task)}
        subtitle={`${CATEGORY_LABELS[data.category]} · активная: ${data.active.name}`}
        backTo={{ to: '/', label: 'Все задачи' }}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Сравнение моделей"
          subtitle={`По метрике ${METRIC_LABELS[primaryMetric] ?? primaryMetric} (${direction === 'up' ? 'больше лучше' : 'меньше лучше'})`}
        >
          <MetricBar
            data={barData}
            direction={direction}
            layout="horizontal"
            valueLabel={primaryMetric}
            height={Math.max(200, barData.length * 56)}
          />
        </Card>

        <Card title="Активная модель" subtitle={data.active.name}>
          <div className="flex flex-col gap-2">
            {Object.entries(data.active.metrics).map(([key, value]) => (
              <div
                key={key}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  key === primaryMetric ? 'bg-accent/10 text-accent' : 'bg-white/5 text-fg'
                }`}
              >
                <span className="font-medium">{METRIC_LABELS[key] ?? key}</span>
                <span className="font-mono">{formatMetricValue(key, value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <CategoryReport data={data} />

      <MetaSection meta={data.active.meta} />

      <Card title="Все модели" subtitle={`${data.all_models.length} шт.`}>
        <DataTable
          columns={columns}
          data={data.all_models}
          rowKey={(r) => r.id}
          rowClassName={(r) => (r.status === 'active' ? 'bg-accent/5' : undefined)}
          defaultSortKey={primaryMetric}
        />
      </Card>
    </div>
  )
}

function CategoryReport({ data }: { data: TaskMetrics }) {
  if (!data.report) return null
  if (data.category === 'classification') return <ClassificationView data={data} />
  if (data.category === 'regression') return <RegressionView data={data} />
  return <ForecastingView data={data} />
}

function MetaSection({ meta }: { meta: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(meta)
  if (entries.length === 0) return null

  return (
    <Card className="mb-6" padded={false}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="text-sm font-semibold text-fg">Метаданные модели</span>
        {open ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
      </button>
      {open && (
        <div className="border-t border-line px-5 py-4">
          <table className="w-full text-sm">
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-4 font-medium text-muted">{key}</td>
                  <td className="py-2 font-mono text-xs text-fg">{formatMetaValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}