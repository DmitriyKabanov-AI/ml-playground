// @ts-nocheck
import { useMemo, type ReactNode } from 'react'
import {
  Activity, CloudRain, Droplets, Gauge, Info, MapPin, Thermometer, Wind,
} from 'lucide-react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  cityDateTick, cityModelNames, cityVariables,
  cityWeatherIcon, evaluateCityModel, type CityVariableKey,
} from '@/lib/data/cityWeather'
import { useWeatherData } from '@/lib/data/weatherArtifacts'

type Props = {
  cityIndex: number
  setCityIndex: (value: number) => void
  variableKey: CityVariableKey
  setVariableKey: (value: CityVariableKey) => void
  modelName: string
  setModelName: (value: string) => void
  showInterval: boolean
  setShowInterval: (value: boolean) => void
}

const fmt = (value: number, digits = 2) => Number.isFinite(value)
  ? value.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }) : '—'
const signed = (value: number, digits = 2) => `${value > 0 ? '+' : ''}${fmt(value, digits)}`

function Panel({ title, subtitle, children, right, className = '' }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{right && <div className="panel-heading-right">{right}</div>}</div>
    {children}
  </section>
}

function Tip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="custom-tooltip"><b>{label}</b>{payload.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value)).map((item, i) =>
    <span key={`${item.name}-${i}`}><i className="tooltip-dot" style={{ background: item.color ?? 'var(--c2)' }} />{item.name}: {fmt(Number(item.value), 2)}</span>)}</div>
}

export default function CityWeatherDashboard({ cityIndex, setCityIndex, variableKey, setVariableKey, modelName, setModelName, showInterval, setShowInterval }: Props) {
  const { cityWeatherDemo } = useWeatherData()
  const city = cityWeatherDemo.cities[cityIndex] ?? cityWeatherDemo.cities[0]
  const spec = cityVariables.find((item) => item.key === variableKey) ?? cityVariables[0]
  const variable = city.vars[spec.key]
  const model = variable.models.find((item) => item.name === modelName) ?? variable.models[0]
  const metrics = evaluateCityModel(cityWeatherDemo, cityIndex, spec.key, model.name)
  const baseline = evaluateCityModel(cityWeatherDemo, cityIndex, spec.key, 'Persistence')
  const points = city.dates
  .map((date, i) => {
    const actual = variable.actual[i]
    const predicted = model.forecast[i]
    if (predicted == null) return null
    return {
      date,
      actual,
      predicted,
      error: predicted - actual,
      absError: Math.abs(predicted - actual),
      low: null as number | null,
      high: null as number | null,
    }
  })
  .filter((p): p is NonNullable<typeof p> => p != null)

  const series = useMemo(() => city.dates.map((date, index) => {
    const pred = model.forecast[index]
    const sd = model.sd[index] ?? 0
    return {
      date, tick: cityDateTick(date),
      actual: index < cityWeatherDemo.nPast ? variable.actual[index] : null,
      predicted: pred,
      low: pred == null ? null : pred - 1.64 * sd,
      band: pred == null ? null : 3.28 * sd,
      high: pred == null ? null : pred + 1.64 * sd,
      today: index === cityWeatherDemo.nPast - 1,
    }
  }), [city, model, variable])

  const leadData = useMemo(() => [1, 2, 3, 4, 5, 6, 7].map((horizon) => {
    const row: Record<string, number | string> = { horizon: `+${horizon} д`, n: horizon }
    const baselineLead = variable.leadMae.Persistence[horizon - 1]
    row[model.name] = variable.leadMae[model.name][horizon - 1]
    row.Persistence = baselineLead
    row.SARIMAX = variable.leadMae.SARIMAX[horizon - 1]
    row.XGBoost = variable.leadMae.XGBoost[horizon - 1]
    row.LSTM = variable.leadMae.LSTM[horizon - 1]
    return row
  }), [variable, model.name])

  const skillData = useMemo(() => cityVariables.map((item) => {
    const result = evaluateCityModel(cityIndex, item.key, model.name)
    return { label: `${item.icon} ${item.label}`, skill: Number((result.skill * 100).toFixed(2)), mae: result.mae, unit: item.unit }
  }), [cityIndex, model.name])

  const comparison = useMemo(() => cityModelNames.map((name) => ({ name, ...evaluateCityModel(cityWeatherDemo, cityIndex, spec.key, name) })), [cityIndex, spec.key])
  const testScatter = points.map((point) => ({ actual: point.actual, predicted: point.predicted, date: point.date }))

  const futureDays = Array.from({ length: cityWeatherDemo.forecastDays }, (_, offset) => {
    const index = cityWeatherDemo.nPast + offset
    const get = (key: CityVariableKey) => {
      const data = city.vars[key]
      return data.models.find((candidate) => candidate.name === model.name)?.forecast[index] ?? data.actual[index - 1] ?? 0
    }
    return { date: city.dates[index], temp: get('temp'), hum: get('hum'), rain: get('rain'), wind: get('wind') }
  })

  const winner = [...comparison].sort((a, b) => b.skill - a.skill)[0]
  const Icon = spec.key === 'temp' ? Thermometer : spec.key === 'hum' ? Droplets : spec.key === 'rain' ? CloudRain : spec.key === 'wind' ? Wind : Gauge

  return <div className="content-stack weather-dashboard city-weather-dashboard">
    <section className="control-strip weather-control-strip">
      <div className="controls-intro"><span className="control-icon"><MapPin size={16} /></span><div><b>Городской прогноз</b><span>Многопараметрическая оценка и 7-дневный прогноз</span></div></div>
      <label className="select-field weather-select"><span>Город</span><select value={cityIndex} onChange={(event) => setCityIndex(Number(event.target.value))}>{cityWeatherDemo.cities.map((item, index) => <option value={index} key={item.name}>{item.name}</option>)}</select></label>
      <label className="select-field weather-select"><span>Модель</span><select value={model.name} onChange={(event) => setModelName(event.target.value)}>{cityModelNames.map((name) => <option key={name}>{name}</option>)}</select></label>
      <div className="variable-selector"><span>Переменная</span><div className="segmented">{cityVariables.map((item) => <button key={item.key} type="button" className={item.key === spec.key ? 'active' : ''} onClick={() => setVariableKey(item.key)}>{item.icon} {item.label}</button>)}</div></div>
      <div className="weather-toggles"><button type="button" className={`toggle-chip ${showInterval ? 'active' : ''}`} aria-pressed={showInterval} onClick={() => setShowInterval(!showInterval)}>90% интервал прогноза</button><span className="model-context"><i className="mini-status" /> {model.name} · {spec.unit}</span></div>
    </section>

    <section className="weather-hero panel">
      <div className="weather-hero-heading"><div><h2><Icon size={19} /> {city.name} <span>·</span> {spec.label}</h2><p>Бэктест за 14 последних исторических дней · прогноз на 7 дней вперёд · модель {model.name}</p></div><span className={metrics.skill >= 0 ? 'skill-badge-positive' : 'skill-badge-negative'}>{metrics.skill >= 0 ? '↑' : '↓'} Skill {signed(metrics.skill * 100, 1)}%</span></div>
      <div className="weather-hero-stats">
        <div><span>MAE · {spec.unit}</span><b>{fmt(metrics.mae)}</b></div>
        <div><span>RMSE · {spec.unit}</span><b>{fmt(metrics.rmse)}</b></div>
        <div><span>R²</span><b>{fmt(metrics.r2, 3)}</b></div>
        <div><span>Bias · {spec.unit}</span><b>{signed(metrics.bias)}</b></div>
      </div>
      <div className="weather-badge-row"><span className="weather-info-pill"><Activity size={13} /> Baseline MAE: <b>{fmt(baseline.mae)} {spec.unit}</b></span><span className="weather-info-pill"><Info size={13} /> {metrics.skill >= 0 ? 'Лучше persistence по MAE' : 'Хуже persistence по MAE'}</span><span className="weather-info-pill">Лучший алгоритм для выбора: <b>{winner?.name ?? '—'}</b></span></div>
    </section>

    <Panel title="Прогноз на 7 дней" subtitle={`${city.name} · ${model.name} · карточки показывают согласованный прогноз температуры, влажности, осадков и ветра`}>
      <div className="city-forecast-cards">{futureDays.map((day) => <article className="city-forecast-day" key={day.date}><div className="forecast-day-date">{new Date(`${day.date}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}</div><div className="forecast-day-icon">{cityWeatherIcon(day.rain, day.temp, day.hum)}</div><div className="forecast-day-temp">{fmt(day.temp, 0)}°</div><div className="forecast-day-detail"><span>💧 {fmt(day.hum, 0)}%</span><span>🌧 {fmt(day.rain, 1)} мм</span><span>💨 {fmt(day.wind, 1)} м/с</span></div></article>)}</div>
    </Panel>

    <Panel title={`${spec.icon} Факт и прогноз: ${spec.label.toLowerCase()}`} subtitle={`История, 14-дневный бэктест и прогнозный участок · единица измерения ${spec.unit}`} className="weather-skill-panel">
      <div className="chart-area chart-tall"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={series} margin={{ top: 12, right: 15, bottom: 4, left: -5 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" /><XAxis dataKey="tick" interval={5} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={43} /><Tooltip content={<Tip />} />
        {showInterval && <><Area type="monotone" dataKey="low" stackId="weather-band" stroke="none" fill="transparent" isAnimationActive={false} connectNulls={false} /><Area type="monotone" dataKey="band" stackId="weather-band" stroke="none" fill="var(--c2)" fillOpacity={0.14} name="90% интервал" isAnimationActive={false} connectNulls={false} /></>}
        <Area type="monotone" dataKey="actual" name={`Факт (${spec.unit})`} stroke="var(--c2)" fill="var(--c2)" fillOpacity={0.07} strokeWidth={1.8} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="predicted" name={`Прогноз ${model.name}`} stroke="var(--c1)" strokeWidth={2.3} dot={false} connectNulls={false} />
        <ReferenceLine x={cityDateTick(city.dates[cityWeatherDemo.nPast - 1])} stroke="var(--c4)" strokeDasharray="4 4" label={{ value: 'СЕГОДНЯ', fill: 'var(--c4)', fontSize: 9, position: 'insideTopRight' }} />
      </ComposedChart></ResponsiveContainer></div>
      <div className="chart-footnote"><span><i className="legend-line actual-line" /> Исторический факт</span><span><i className="legend-line forecast-line" /> Прогноз модели</span><span>Пунктир — начало будущего периода</span></div>
    </Panel>

    <section className="three-column city-chart-row">
      <Panel title="MAE по горизонту" subtitle="Прогнозная ошибка на 1–7 дней вперёд"><div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><LineChart data={leadData} margin={{ top: 10, right: 8, bottom: 4, left: -14 }}><CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" /><XAxis dataKey="horizon" tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} width={35} /><Tooltip content={<Tip />} /><Line type="monotone" dataKey={model.name} name={model.name} stroke="var(--c2)" strokeWidth={2.5} dot={{ r: 2 }} /><Line type="monotone" dataKey="Persistence" name="Persistence" stroke="var(--muted)" strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer></div></Panel>
      <Panel title="Predicted vs Actual" subtitle="Бэктест · каждая точка — исторический день"><div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 10, right: 12, bottom: 4, left: -12 }}><CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" /><XAxis type="number" dataKey="actual" name="Факт" tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis type="number" dataKey="predicted" name="Прогноз" tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} width={35} /><Tooltip cursor={{ strokeDasharray: '3 3' }} content={<Tip />} /><Scatter data={testScatter} name="Дни" fill="var(--c1)" fillOpacity={0.72} /></ScatterChart></ResponsiveContainer></div></Panel>
      <Panel title="Skill по переменным" subtitle={`Skill vs persistence · модель ${model.name}`}><div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={skillData} layout="vertical" margin={{ top: 7, right: 14, bottom: 2, left: 5 }}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--chart-grid)" /><XAxis type="number" tickFormatter={(value) => `${value}%`} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="label" width={94} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip content={<Tip />} /><ReferenceLine x={0} stroke="var(--muted)" /><Bar dataKey="skill" name="Skill, %" radius={[0, 4, 4, 0]}>{skillData.map((item) => <Cell key={item.label} fill={item.skill >= 0 ? 'var(--c3)' : 'var(--c5)'} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
    </section>

    <Panel title="Сравнение моделей" subtitle={`Метрики на общей 14-дневной тестовой выборке · ${city.name} · ${spec.label}`} right={<span className="small-tag">4 МОДЕЛИ</span>}>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Модель</th><th>MAE</th><th>RMSE</th><th>R²</th><th>MAPE</th><th>Bias</th><th>Max error</th><th>MedAE</th><th>Skill</th></tr></thead><tbody>{comparison.map((row) => <tr key={row.name} className={row.name === model.name ? 'row-selected click' : 'click'} onClick={() => setModelName(row.name)} title="Нажмите, чтобы выбрать модель"><td><span className="model-cell">{row.name}{row.name === 'Persistence' && <span className="weather-baseline-tag">baseline</span>}</span></td><td>{fmt(row.mae)}</td><td>{fmt(row.rmse)}</td><td>{fmt(row.r2, 3)}</td><td>{fmt(row.mape, 1)}%</td><td>{signed(row.bias)}</td><td>{fmt(row.maxError)}</td><td>{fmt(row.medae)}</td><td className={row.skill >= 0 ? 'positive-text' : 'negative-text'}>{signed(row.skill * 100, 1)}%</td></tr>)}</tbody></table></div>
      <div className="table-note"><Info size={13} /> Skill = 1 − MAE модели / MAE persistence. Весь набор синтетический; качество не отражает реальные прогнозы в выбранном городе.</div>
    </Panel>

  </div>
}


