// @ts-nocheck

import { useMemo, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CloudSun,
  MapPin,
  Thermometer,
} from 'lucide-react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  mean,
  meanSkillForModel,
  type WeatherEvaluation,
  type WeatherStationDataset,
} from '@/lib/data/demoWeather'
import { useWeatherData } from '@/lib/data/weatherArtifacts'

const palette = {
  cyan: '#22d3ee',
  indigo: '#818cf8',
  green: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
  purple: '#c4b5fd',
  gray: '#94a3b8',
  blue: '#60a5fa',
}

const fmt = (value: number, digits = 2) => Number.isFinite(value)
  ? value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: digits })
  : '—'
const signed = (value: number, digits = 3) => `${value > 0 ? '+' : ''}${fmt(value, digits)}`

export type WeatherSampleMode = 'accurate' | 'error'

export type WeatherDashboardProps = {
  stationId: number
  setStationId: (value: number) => void
  modelName: string
  setModelName: (value: string) => void
  horizon: number
  setHorizon: (value: number) => void
  showBaseline: boolean
  setShowBaseline: (value: boolean) => void
  showSkillCorridor: boolean
  setShowSkillCorridor: (value: boolean) => void
  sampleMode: WeatherSampleMode
  setSampleMode: (value: WeatherSampleMode) => void
}

function Panel({ title, subtitle, children, className = '', right }: { title: string; subtitle?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return <section className={`panel ${className}`}>
    <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{right && <div className="panel-heading-right">{right}</div>}</div>
    {children}
  </section>
}

function MetricCard({ label, value, note, tone, icon }: { label: string; value: string; note: string; tone: 'cyan' | 'green' | 'amber' | 'purple'; icon: ReactNode }) {
  return <article className={`metric-card tone-${tone}`}>
    <div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div>
    <div className="metric-value">{value}</div>
    <div className="metric-note">{note}</div>
  </article>
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={`toggle-chip ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>
    <span className="toggle-check">{active ? '✓' : ''}</span>{children}
  </button>
}

function GenericWeatherTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; color?: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null
  return <div className="custom-tooltip"><b>{label}</b>{payload.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value)).map((item, index) =>
    <span key={`${item.name}-${index}`}><i className="tooltip-dot" style={{ background: item.color ?? palette.cyan }} />{item.name}: {fmt(Number(item.value), 2)}{typeof label === 'number' || String(item.name).toLowerCase().includes('mae') || ['Факт', 'Прогноз h=1', 'Прогноз h=14'].includes(String(item.name)) ? ' °C' : ''}</span>,
  )}</div>
}

function SkillTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; color?: string; payload?: Record<string, unknown> }>; label?: string | number }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload ?? {}
  const visible = payload.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value) && !String(item.name).toLowerCase().includes('corridor'))
  return <div className="custom-tooltip">
    <b>Горизонт h={String(row.horizon ?? label)} дн.</b>
    {typeof row.selectedMae === 'number' && <span>MAE: {fmt(row.selectedMae)} °C</span>}
    {typeof row.selectedSkill === 'number' && <span>Skill: <strong className={Number(row.selectedSkill) >= 0 ? 'positive-text' : 'negative-text'}>{signed(Number(row.selectedSkill))}</strong></span>}
    {typeof row.selectedDelta === 'number' && <span>Δ vs persistence: {signed(Number(row.selectedDelta), 2)} °C</span>}
    {visible.map((item, index) => <span key={`${item.name}-${index}`}><i className="tooltip-dot" style={{ background: item.color ?? palette.cyan }} />{item.name}: {signed(Number(item.value), 3)}</span>)}
  </div>
}

export default function WeatherDashboard(props: WeatherDashboardProps) {
  const { weatherDemo } = useWeatherData()
  const weatherModels = weatherDemo.models
  const featureImportance = weatherDemo.featureImportance
  const {
    stationId, setStationId, modelName, setModelName, horizon, setHorizon,
    showBaseline, setShowBaseline, showSkillCorridor, setShowSkillCorridor,
    sampleMode, setSampleMode,
  } = props
  const stationData: WeatherStationDataset = weatherDemo.stationData.find((item: any) => item.station.id === stationId) ?? weatherDemo.stationData[0]
  const station = stationData.station
  const current: WeatherEvaluation = stationData.evaluations[modelName][horizon]
  const currentMetrics = current.metrics
  const zeroCrossing = weatherDemo.horizons.find((h) => stationData.evaluations[modelName][h].metrics.skill <= 0)

  const bestStation = useMemo(() => weatherDemo.stationData.map((item) => ({
    data: item,
    score: meanSkillForModel(item, modelName),
  })).sort((a, b) => b.score - a.score)[0], [modelName])

  const bestModel = useMemo(() => weatherModels.filter((model) => !model.isBaseline).map((model) => ({
    name: model.name,
    score: mean(weatherDemo.stationData.map((item) => meanSkillForModel(item, model.name))),
  })).sort((a, b) => b.score - a.score)[0], [])

  const skillData = useMemo(() => weatherDemo.horizons.map((h) => {
    const selected = stationData.evaluations[modelName][h]
    const persistence = stationData.evaluations.Persistence[h]
    const skill = selected.metrics.skill
    const uncertainty = Math.max(0.025, selected.metrics.rmse / Math.sqrt(Math.max(1, selected.points.length)) / Math.max(0.5, persistence.metrics.mae))
    const row: Record<string, number> = {
      horizon: h,
      selectedSkill: skill,
      selectedMae: selected.metrics.mae,
      selectedDelta: selected.deltaVsPersistence,
      lowerSkill: skill - uncertainty,
      upperSkill: skill + uncertainty,
      skillBand: uncertainty * 2,
    }
    // add every trained model's skill for a consistent 8-model comparison
    weatherModels.forEach((model) => {
      row[`skill_${model.name.replace(/[^A-Za-z0-9]/g, '')}`] = stationData.evaluations[model.name][h].metrics.skill
    })
    return row
  }), [stationData, modelName, weatherModels])

  const stationMaeData = useMemo(() => weatherDemo.horizons.map((h) => {
    const row: Record<string, string | number> = { horizon: h }
    weatherDemo.stationData.forEach((item) => { row[item.station.label] = item.evaluations[modelName][h].metrics.mae })
    return row
  }), [modelName])

  const modelMaeData = useMemo(() => weatherDemo.horizons.map((h) => {
    const row: Record<string, string | number> = { horizon: h }
    weatherModels.forEach((model) => { row[model.name.replace(/ /g, '')] = stationData.evaluations[model.name][h].metrics.mae })
    return row
  }), [stationData])

  return <div className="content-stack weather-dashboard">
    <section className="control-strip weather-control-strip">
      <div className="controls-intro"><span className="control-icon"><CloudSun size={17} /></span><div><b>Настройка прогноза</b><span>8 моделей · общая отложенная выборка · горизонты 1–14 дней</span></div></div>
      <label className="select-field weather-select"><span>Станция</span><select value={stationId} onChange={(event) => setStationId(Number(event.target.value))} aria-label="Станция">
        {weatherDemo.stations.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.id}</option>)}
      </select></label>
      <label className="select-field weather-select"><span>Модель</span><select value={modelName} onChange={(event) => setModelName(event.target.value)} aria-label="Модель">
        {weatherModels.map((model) => <option key={model.name} value={model.name}>{model.name}{model.isBaseline ? ' · baseline' : ''}</option>)}
      </select></label>
      <div className="horizon-control weather-horizon-control"><span>Горизонт, дней</span><div className="segmented">
        {[1, 3, 7, 14].map((h) => <button type="button" key={h} className={horizon === h ? 'active' : ''} onClick={() => setHorizon(h)}>{h}</button>)}
      </div></div>
      <div className="toggle-controls weather-toggles">
        <ToggleChip active={showBaseline} onClick={() => setShowBaseline(!showBaseline)}>Показать baseline</ToggleChip>
        <ToggleChip active={showSkillCorridor} onClick={() => setShowSkillCorridor(!showSkillCorridor)}>Skill-коридор</ToggleChip>
      </div>
    </section>

    <section className="panel weather-hero">
      <div className="weather-hero-heading"><div><div className="eyebrow">FORECASTING · DEMO RUN</div><h2><MapPin size={16} /> Станция {station.label} <span>·</span> {modelName} <span>·</span> h={horizon}</h2><p>Исторический бэктест: качество на отложенных датах, а не оперативный прогноз погоды.</p></div>
        <span className={`skill-badge-${currentMetrics.skill >= 0 ? 'positive' : 'negative'}`}>{currentMetrics.skill >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} Skill {signed(currentMetrics.skill)}</span>
      </div>
      <div className="weather-hero-stats">
        <div><span>MAE</span><b>{fmt(currentMetrics.mae)} °C</b></div>
        <div><span>Skill vs persistence</span><b>{signed(currentMetrics.skill)}</b></div>
        <div><span>Средний сдвиг · Bias</span><b>{signed(currentMetrics.bias, 2)} °C</b></div>
        <div><span>Хуже persistence?</span><b className={currentMetrics.skill <= 0 ? 'negative-text' : 'positive-text'}>{currentMetrics.skill <= 0 ? 'Да' : 'Нет'}</b></div>
      </div>
      <div className="weather-badge-row"><span className="weather-info-pill"><MapPin size={12} /> Лучшая станция по mean skill: <b>{bestStation.data.station.label} ({signed(bestStation.score)})</b></span><span className="weather-info-pill"><CloudSun size={12} /> Лучшая модель: <b>{bestModel.name} (mean skill {signed(bestModel.score)})</b></span><span className="weather-info-pill"><CalendarDays size={12} /> Zero-crossing: <b>{zeroCrossing ? `h=${zeroCrossing}` : 'не найден'}</b></span></div>
      <div className="weather-horizon-slider"><label htmlFor="weather-horizon-slider"><span>Горизонт прогноза</span><b>{horizon} дн.</b></label><input id="weather-horizon-slider" className="horizon-slider" type="range" min="1" max="14" step="1" value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} /><div><span>1 день</span><span>14 дней</span></div></div>
    </section>

    <section className="metrics-grid">
      <MetricCard label="MAE · °C" value={`${fmt(currentMetrics.mae)} °C`} note="Средняя абсолютная ошибка" tone="cyan" icon={<Thermometer size={17} />} />
      <MetricCard label="RMSE · °C" value={`${fmt(currentMetrics.rmse)} °C`} note="Сильнее штрафует крупные промахи" tone="green" icon={<CloudSun size={17} />} />
      <MetricCard label="Skill(h)" value={signed(currentMetrics.skill)} note={currentMetrics.skill >= 0 ? 'Лучше persistence baseline' : 'Хуже persistence baseline'} tone="purple" icon={currentMetrics.skill >= 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />} />
      <MetricCard label="Bias · °C" value={`${signed(currentMetrics.bias, 2)} °C`} note="Средний сдвиг прогноза" tone="amber" icon={<Thermometer size={17} />} />
    </section>

    <section className="two-column weather-charts-row">
      <Panel title="Skill(h) по горизонтам" subtitle={`Станция ${station.label} · skill = 1 − MAE модели / MAE persistence`} className="weather-skill-panel" right={<span className="small-tag">h = 1…14</span>}>
        <div className="chart-area chart-tall"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={skillData} margin={{ top: 16, right: 14, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" /><XAxis dataKey="horizon" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Горизонт h, дней', position: 'insideBottom', offset: -1, fill: 'var(--muted)', fontSize: 9 }} /><YAxis tickFormatter={(value) => Number(value).toFixed(1)} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={42} /><Tooltip content={<SkillTooltip />} /><ReferenceLine y={0} stroke={palette.rose} strokeDasharray="5 4" label={{ value: 'persistence-уровень', fill: palette.rose, fontSize: 9, position: 'insideTopLeft' }} />
          {showSkillCorridor && <><Area type="monotone" dataKey="lowerSkill" name="Skill corridor lower" stackId="skillRange" stroke="none" fill="transparent" fillOpacity={0} activeDot={false} /><Area type="monotone" dataKey="skillBand" name="Skill corridor width" stackId="skillRange" stroke="none" fill={palette.cyan} fillOpacity={0.10} activeDot={false} /><Line type="monotone" dataKey="upperSkill" name="Skill corridor upper" stroke={palette.cyan} strokeOpacity={0.32} strokeDasharray="2 4" dot={false} activeDot={false} /><Line type="monotone" dataKey="lowerSkill" name="Skill corridor lower" stroke={palette.cyan} strokeOpacity={0.32} strokeDasharray="2 4" dot={false} activeDot={false} /></>}
          <Line type="monotone" dataKey="selectedSkill" name={`${modelName} · выбранная`} stroke={palette.cyan} strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
          {weatherModels.filter((model) => model.name !== modelName && (!model.isBaseline || showBaseline)).map((model, index) => {
            const colors: Record<string, string> = {
  Persistence: palette.gray,
  'Seasonal Naive': '#64748b',
  Ridge: palette.purple,
  RandomForest: palette.indigo,
  MLP: palette.amber,
  XGBoost: palette.blue,
  SARIMAX: palette.green,
  LSTM: palette.rose,
}
            const key = `skill_${model.name.replace(/[^A-Za-z0-9]/g, '')}`
            return <Line key={model.name} type="monotone" dataKey={key} name={model.name}
              stroke={colors[model.name] ?? palette.green} strokeWidth={1.5}
              strokeDasharray={model.isBaseline ? (model.name === 'Persistence' ? '6 4' : '2 4') : undefined}
              strokeOpacity={0.82} dot={false} activeDot={{ r: 3 }} />
          })}
        </ComposedChart></ResponsiveContainer></div>
        <div className="chart-footnote"><span>Skill &gt; 0 — лучше наивного прогноза</span><span>Skill &lt; 0 — хуже persistence</span></div>
      </Panel>

      <Panel title="MAE(h) по станциям" subtitle={`Модель ${modelName} · климатические зоны в одном масштабе`}>
        <div className="chart-area chart-tall"><ResponsiveContainer width="100%" height="100%"><LineChart data={stationMaeData} margin={{ top: 10, right: 9, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" /><XAxis dataKey="horizon" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `${fmt(Number(value), 0)}`} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={35} /><Tooltip content={<GenericWeatherTooltip />} /><Legend wrapperStyle={{ fontSize: 9, color: 'var(--muted)' }} />
          {weatherDemo.stations.map((item, index) => <Line key={item.id} type="monotone" dataKey={item.label} name={item.label} stroke={[palette.cyan, palette.indigo, palette.green, palette.amber, palette.purple][index]} strokeWidth={item.id === station.id ? 2.8 : 1.6} strokeOpacity={item.id === station.id ? 1 : 0.8} dot={false} activeDot={{ r: 3 }} />)}
        </LineChart></ResponsiveContainer></div>
        <div className="chart-footnote"><span>Единицы MAE: °C</span><span>Выбранная станция выделена более толстой линией</span></div>
      </Panel>
    </section>

    <section className="two-column weather-charts-row">
      <Panel title="MAE(h) по моделям" subtitle={`Станция ${station.label} · меньше — лучше`}>
        <div className="chart-area chart-tall"><ResponsiveContainer width="100%" height="100%"><LineChart data={modelMaeData} margin={{ top: 10, right: 8, bottom: 3, left: -8 }}>
          <CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" /><XAxis dataKey="horizon" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => fmt(Number(value), 0)} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={34} /><Tooltip content={<GenericWeatherTooltip />} /><Legend wrapperStyle={{ fontSize: 9, color: 'var(--muted)' }} />
          {weatherModels.filter((model) => model.name === modelName || !model.isBaseline || showBaseline).map((model) => {
            const colors: Record<string, string> = {
  Persistence: palette.gray,
  'Seasonal Naive': '#64748b',
  Ridge: palette.purple,
  RandomForest: palette.indigo,
  MLP: palette.amber,
  XGBoost: palette.blue,
  SARIMAX: palette.green,
  LSTM: palette.rose,
}
            return <Line key={model.name} type="monotone"
              dataKey={model.name.replace(/ /g, '')} name={model.name}
              stroke={model.name === modelName ? palette.cyan : colors[model.name] ?? palette.green}
              strokeWidth={model.name === modelName ? 2.8 : model.isBaseline ? 2 : 1.5}
              strokeDasharray={model.isBaseline ? (model.name === 'Persistence' ? '7 4' : '2 4') : undefined}
              dot={false} activeDot={{ r: 3 }} />
          })}
        </LineChart></ResponsiveContainer></div>
        <div className="chart-footnote"><span>Persistence — базовая точка сравнения</span><span>Все ошибки рассчитаны на общей тестовой части</span></div>
      </Panel>

      <Panel title="Важность признаков" subtitle="Одна демонстрационная оценка важности для всего модуля">
        <div className="chart-area chart-tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={featureImportance} layout="vertical" margin={{ top: 3, right: 18, bottom: 3, left: 5 }}>
          <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--chart-grid)" /><XAxis type="number" domain={[0, 0.36]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={88} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip content={<GenericWeatherTooltip />} /><Bar dataKey="value" name="Importance" fill={palette.purple} radius={[0, 4, 4, 0]} barSize={12}>{featureImportance.map((item, index) => <Cell key={item.name} fill={[palette.cyan, palette.indigo, palette.green, palette.purple, palette.amber, palette.blue, palette.gray, palette.rose, palette.cyan, palette.indigo][index]} />)}</Bar>
        </BarChart></ResponsiveContainer></div>
        <div className="chart-footnote"><span>Сумма importance = 1,00</span><span>lag и rolling-признаки доминируют в демо-профиле</span></div>
      </Panel>
    </section>

  </div>
}

