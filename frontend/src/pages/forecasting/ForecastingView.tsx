import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Empty } from '../../components/ui/Empty'
import { Badge } from '../../components/ui/Badge'
import { SelectField } from '../../components/ui/SelectField'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { ForecastLine } from '../../components/charts/ForecastLine'
import type { ForecastDatum } from '../../components/charts/ForecastLine'
import { SkillByHorizon } from '../../components/charts/SkillByHorizon'
import type { TaskMetrics, WeatherReport, WeatherStation } from '../../types'

interface ForecastingViewProps {
  data: TaskMetrics
}

export default function ForecastingView({ data }: ForecastingViewProps) {
  const report = data.report as WeatherReport | undefined
  const [stationId, setStationId] = useState<string | null>(null)

  if (!report) return <Empty />

  const { headline, stations, by_horizon } = report
  if (stations.length === 0) return <Empty />

  const activeStation = stations.find((s) => String(s.station_id) === stationId) ?? stations[0]

  const modelNames = Object.keys(activeStation.mae_by_horizon)
  const horizonKeys = Object.keys(activeStation.mae_by_horizon[modelNames[0]] ?? {})
  const horizons = horizonKeys.map(Number).sort((a, b) => a - b)

  const maeData = horizons.map((h) => {
    const point: ForecastDatum = { horizon: h }
    modelNames.forEach((model) => {
      const value = activeStation.mae_by_horizon[model]?.[String(h)]
      if (value !== undefined) point[model] = value
    })
    return point
  })

  const skillModelNames = modelNames.filter((m) => m !== 'persistence' && m !== 'seasonal')
  const skillData = horizons.map((h) => {
    const point: ForecastDatum = { horizon: h }
    skillModelNames.forEach((model) => {
      const value = activeStation.skill_by_horizon[model]?.[String(h)]
      if (value !== undefined) point[model] = value
    })
    return point
  })

  const dv = headline.diagnostic_verdict

  const stationColumns: DataTableColumn<WeatherStation>[] = [
    { key: 'station_id', header: 'Станция', sortable: true, accessor: (r) => r.station_id },
    { key: 'label', header: 'Регион', render: (r) => r.label ?? '—' },
    { key: 'n_test', header: 'N test', sortable: true, accessor: (r) => r.n_test, align: 'right' },
    { key: 'best_model', header: 'Лучшая модель', render: (r) => r.best_model },
    {
      key: 'hero_value',
      header: 'Skill',
      sortable: true,
      accessor: (r) => r.hero_value,
      render: (r) => r.hero_value.toFixed(4),
      align: 'right',
    },
  ]

  return (
    <div className="mb-6 flex flex-col gap-4">
      <Card title="Вердикт" subtitle={`Лучшая станция: ${headline.best_station_label} (#${headline.best_station}) · модель ${headline.best_model}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="success">{headline.best_model}</Badge>
          <Badge tone="accent">
            {headline.hero_metric}: {headline.hero_value.toFixed(4)}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-fg">{headline.verdict}</p>
      </Card>

      <Card title="Станции">
        <DataTable columns={stationColumns} data={stations} rowKey={(r) => r.station_id} defaultSortKey="hero_value" />
      </Card>

      <Card
        title="Детализация по станции"
        actions={
          <SelectField
            value={String(activeStation.station_id)}
            onChange={setStationId}
            options={stations.map((s) => ({
              value: String(s.station_id),
              label: s.label ? `${s.label} (#${s.station_id})` : String(s.station_id),
            }))}
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">MAE по горизонтам</p>
            {maeData.length ? (
              <ForecastLine data={maeData} lines={modelNames.map((m) => ({ key: m, label: m }))} yLabel="MAE" />
            ) : (
              <Empty />
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Skill по горизонтам</p>
            {skillData.length ? (
              <ForecastLine data={skillData} lines={skillModelNames.map((m) => ({ key: m, label: m }))} yLabel="Skill" />
            ) : (
              <Empty />
            )}
          </div>
        </div>
      </Card>

      <Card title="Skill по горизонтам (среднее по всем станциям)">
        {Object.keys(by_horizon).length ? <SkillByHorizon byHorizon={by_horizon} /> : <Empty />}
      </Card>

      <Card title="Диагностика (Ridge vs RandomForest vs Persistence)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DiagItem label="Skill h1 (Ridge)" value={dv.skill_h1_ridge_mean} />
          <DiagItem label="Skill h14 (Ridge)" value={dv.skill_h14_ridge_mean} />
          <DiagItem label="Skill h1 (RF)" value={dv.skill_h1_rf_mean} />
          <DiagItem label="Skill h14 (RF)" value={dv.skill_h14_rf_mean} />
          <BoolItem label="Skill падает с горизонтом" value={dv.skill_drops_with_horizon} />
          <BoolItem label="ML лучше persistence (h1)" value={dv.ml_beats_persistence_at_h1} />
          <BoolItem label="ML хуже persistence (h14)" value={dv.ml_loses_to_persistence_at_h14} />
        </div>
      </Card>
    </div>
  )
}

function DiagItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-fg">{value.toFixed(4)}</p>
    </div>
  )
}

function BoolItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <Badge tone={value ? 'success' : 'danger'} className="mt-1">
        {value ? 'да' : 'нет'}
      </Badge>
    </div>
  )
}