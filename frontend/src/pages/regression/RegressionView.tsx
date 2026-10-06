import { Card } from '../../components/ui/Card'
import { Empty } from '../../components/ui/Empty'
import { Badge } from '../../components/ui/Badge'
import { ImportanceBar } from '../../components/charts/ImportanceBar'
import { MetricBar } from '../../components/charts/MetricBar'
import { AvpScatter } from '../../components/charts/AvpScatter'
import { ResidualsScatter } from '../../components/charts/ResidualsScatter'
import { Histogram } from '../../components/charts/Histogram'
import { METRIC_DIRECTION, METRIC_LABELS, formatMetricValue } from '../../lib/category'
import type { RegressionReport, TaskMetrics } from '../../types'

interface RegressionViewProps {
  data: TaskMetrics
}

export default function RegressionView({ data }: RegressionViewProps) {
  const report = data.report as RegressionReport | undefined
  if (!report) return <Empty />

  const { headline, residual_diagnostics, by_metric, feature_importance, sample_predictions } = report
  const bestImportance = feature_importance[headline.best_model] ?? []

  const diagnosticItems: Array<{ label: string; value: string }> = [
    { label: 'Bias', value: residual_diagnostics.bias.toFixed(4) },
    { label: 'Медиана остатка', value: residual_diagnostics.median_residual.toFixed(4) },
    { label: 'Std остатка', value: residual_diagnostics.std_residual.toFixed(4) },
    { label: 'Асимметрия', value: residual_diagnostics.skew.toFixed(3) },
    { label: 'Эксцесс', value: residual_diagnostics.kurtosis.toFixed(3) },
    { label: '% вне 2×MAE', value: `${residual_diagnostics.pct_beyond_2mae.toFixed(2)}%` },
  ]

  const metricComparisons = Object.keys(by_metric).map((metric) => ({
    metric,
    data: Object.entries(by_metric[metric]).map(([name, value]) => ({ name, value })),
  }))

  const hasPredictions = Boolean(sample_predictions && sample_predictions.length > 0)

  return (
    <div className="mb-6 flex flex-col gap-4">
      <Card title="Вердикт" subtitle={`Лучшая модель: ${headline.best_model}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="success">{headline.best_model}</Badge>
          <Badge tone="accent">
            {METRIC_LABELS[headline.best_metric] ?? headline.best_metric}: {formatMetricValue(headline.best_metric, headline.best_metric_value)}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-fg">{headline.verdict}</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Важность признаков" subtitle={headline.best_model}>
          {bestImportance.length ? <ImportanceBar data={bestImportance} /> : <Empty />}
        </Card>

        <Card title="Диагностика остатков">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {diagnosticItems.map((item) => (
              <div key={item.label} className="rounded-xl bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-fg">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {hasPredictions && sample_predictions && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card title="Факт vs Прогноз">
            <AvpScatter data={sample_predictions} />
          </Card>
          <Card title="Остатки">
            <ResidualsScatter data={sample_predictions} />
          </Card>
        </div>
      )}

      {hasPredictions && sample_predictions && (
        <Card title="Распределение остатков">
          <Histogram values={sample_predictions.map((p) => p.y_true - p.y_pred)} />
        </Card>
      )}

      {metricComparisons.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {metricComparisons.map(({ metric, data: mData }) => (
            <Card key={metric} title={METRIC_LABELS[metric] ?? metric}>
              <MetricBar data={mData} direction={METRIC_DIRECTION[metric] ?? 'down'} valueLabel={metric} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}