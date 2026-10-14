// @ts-nocheck
"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Activity, BarChart3, CloudRain,
  CloudSun, Database, Download, LayoutDashboard, Layers3,
  MapPin, Moon, Sun, Thermometer, Wind, Info, Printer,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import WeatherDashboard, { type WeatherSampleMode } from './WeatherDashboard'
import CityWeatherDashboard from './CityWeatherDashboard'
import { mean } from '@/lib/data/demoWeather'
import { cityDateTick, cityModelNames, cityVariables, evaluateCityModel, type CityVariableKey } from '@/lib/data/cityWeather'
import { WeatherDataProvider, useWeatherData } from '@/lib/data/weatherArtifacts'

type Theme = 'dark' | 'light'
type Page = 'overview' | 'stations' | 'cities' | 'models' | 'features'

const pageMeta: Record<Page, { title: string; subtitle: string; icon: typeof CloudSun }> = {
  overview: { title: 'Обзор погодных моделей', subtitle: 'Единая панель качества, станций и многопараметрических городских прогнозов.', icon: LayoutDashboard },
  stations: { title: 'Температурные станции', subtitle: 'Backtest на временных рядах, горизонты 1–14 дней и сравнение с baseline.', icon: Thermometer },
  cities: { title: 'Городской прогноз', subtitle: 'Температура, влажность, осадки, ветер и давление для четырёх демо-городов.', icon: CloudSun },
  models: { title: 'Сравнение моделей', subtitle: 'Сопоставление алгоритмов внутри каждого бенчмарка и по всей демо-выборке.', icon: BarChart3 },
  features: { title: 'Признаки и метрики', subtitle: 'Важность временных признаков, описание алгоритмов и правила чтения метрик.', icon: Layers3 },
}

const fmt = (value: number, digits = 2) => Number.isFinite(value)
  ? value.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }) : '—'
const signed = (value: number, digits = 2) => `${value > 0 ? '+' : ''}${fmt(value, digits)}`
const pct = (value: number, digits = 1) => `${value >= 0 ? '+' : ''}${fmt(value * 100, digits)}%`

function Panel({ title, subtitle, children, right, className = '' }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{right && <div className="panel-heading-right">{right}</div>}</div>
    {children}
  </section>
}

function Metric({ label, value, note, tone = 'cyan', icon }: { label: string; value: string; note: string; tone?: 'cyan' | 'green' | 'amber' | 'purple'; icon: ReactNode }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></article>
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="custom-tooltip"><b>{label}</b>{payload.filter((item) => typeof item.value === 'number' && Number.isFinite(item.value)).map((item, index) => <span key={`${item.name}-${index}`}><i className="tooltip-dot" style={{ background: item.color ?? 'var(--c2)' }} />{item.name}: {fmt(Number(item.value), 2)}</span>)}</div>
}

function OverviewPage({ stationId, stationModel, stationHorizon, cityIndex }: {
  stationId: number; stationModel: string; stationHorizon: number; cityIndex: number
}) {
  const { weatherDemo, cityWeatherDemo } = useWeatherData()
  const weatherModels = weatherDemo.models
  const selected = weatherDemo.stationData.find((item: any) => item.station.id === stationId) ?? weatherDemo.stationData[0]
  const evaluation = selected.evaluations[stationModel][stationHorizon]
  const stationSeries = selected.series.slice(-220).map((day) => ({ date: day.date.slice(5), actual: day.actual, anomaly: day.anomaly ? day.actual : null }))
  const stationRows = useMemo(() => weatherModels.filter((model) => !model.isBaseline).map((model) => {
    const scores = weatherDemo.stationData.flatMap((station) => weatherDemo.horizons.map((h) => station.evaluations[model.name][h].metrics.skill))
    return { name: model.name, skill: mean(scores), color: model.name === stationModel ? 'var(--c2)' : 'var(--bar-muted)' }
  }).sort((a, b) => b.skill - a.skill), [stationModel])
  const cityRanks = useMemo(() => cityModelNames.map((name) => {
    const scores = cityWeatherDemo.cities.flatMap((_, ci) => cityVariables.map((variable) => evaluateCityModel(cityWeatherDemo, ci, variable.key, name).skill))
    return { name, skill: mean(scores), selected: name === 'LSTM' }
  }).sort((a, b) => b.skill - a.skill), [])
  const forecastCity = cityWeatherDemo.cities[cityIndex] ?? cityWeatherDemo.cities[0]
  const temp = forecastCity.vars.temp
  const forecastModel = temp.models.find((item) => item.name === 'LSTM') ?? temp.models[0]
  const cityPreview = forecastCity.dates.slice(cityWeatherDemo.nPast - 7, cityWeatherDemo.nPast + cityWeatherDemo.forecastDays).map((date, index) => {
    const realIndex = cityWeatherDemo.nPast - 7 + index
    return { date: cityDateTick(date), actual: realIndex < cityWeatherDemo.nPast ? temp.actual[realIndex] : null, forecast: forecastModel.forecast[realIndex] }
  })
  const CityIcon = cityIndex === 0 ? CloudSun : cityIndex === 1 ? Wind : cityIndex === 2 ? CloudRain : Sun
  return <div className="content-stack">
    <section className="overview-banner"><div className="overview-banner-copy"><div className="banner-kicker"><span className="source-dot" /> WEATHER ML LAB · DEMO</div><h2>Погода — от прогноза до качества модели</h2><p>Интерактивная консоль для бэктеста температурных рядов и оценки нескольких погодных параметров. Все наблюдения синтетические, вычисляются в браузере и не требуют API.</p></div><div className="overview-weather-mark"><div className="weather-orbit orbit-one" /><div className="weather-orbit orbit-two" /><CloudSun size={76} strokeWidth={1.1} /><span>ML</span></div></section>

    <section className="metrics-grid overview-metrics">
      <Metric label="Станции" value="4" note="Температурные ряды · train/test" tone="cyan" icon={<MapPin size={16} />} />
      <Metric label="Города" value="04" note="Москва, Алматы, Сараево, Тбилиси" tone="green" icon={<CloudSun size={16} />} />
      <Metric label="Переменные" value="05" note="°C · влажность · осадки · ветер · давление" tone="amber" icon={<Activity size={16} />} />
      <Metric label="Типы моделей" value="08" note="Две линейки бенчмарков, включая baseline" tone="purple" icon={<Layers3 size={16} />} />
    </section>

    <section className="two-column overview-charts">
      <Panel title="Температурный ряд станции" subtitle={`${selected.station.label} · последние 220 дней синтетической истории`}>
        <div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={stationSeries} margin={{ top: 8, right: 8, bottom: 4, left: -10 }}><defs><linearGradient id="overviewStationFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--c2)" stopOpacity={0.24} /><stop offset="100%" stopColor="var(--c2)" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" /><XAxis dataKey="date" interval={29} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `${fmt(Number(value), 0)}°`} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} width={40} /><Tooltip content={<ChartTip />} /><Area dataKey="actual" name="Температура, факт" stroke="var(--c2)" strokeWidth={1.5} fill="url(#overviewStationFill)" dot={false} /><Line dataKey="anomaly" name="Аномалии" stroke="var(--c5)" strokeWidth={0} dot={{ r: 3, fill: 'var(--c5)' }} connectNulls={false} /></ComposedChart></ResponsiveContainer></div>
        <div className="chart-footnote"><span>Синтетическая история с сезонностью и шумом</span><span>Skill выбранной модели: <b className={evaluation.metrics.skill >= 0 ? 'positive-text' : 'negative-text'}>{signed(evaluation.metrics.skill)}</b> на h={stationHorizon}</span></div>
      </Panel>
      <Panel title={`Городской прогноз · ${forecastCity.name}`} subtitle="Факт за последнюю неделю и моделируемое продолжение">
        <div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cityPreview} margin={{ top: 8, right: 8, bottom: 4, left: -10 }}><CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" /><XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `${fmt(Number(value), 0)}°`} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} width={40} /><Tooltip content={<ChartTip />} /><Area dataKey="actual" name="Факт" stroke="var(--c2)" fill="var(--c2)" fillOpacity={0.06} dot={false} /><Line dataKey="forecast" name="Прогноз LSTM" stroke="var(--c1)" strokeWidth={2.3} dot={false} connectNulls={false} /><ReferenceLine x={cityDateTick(cityWeatherDemo.dates[cityWeatherDemo.nPast - 1])} stroke="var(--c4)" strokeDasharray="4 4" /></ComposedChart></ResponsiveContainer></div>
        <div className="chart-footnote"><span><CityIcon size={13} /> Температура · °C</span><span>В модели также доступны 4 других переменных</span></div>
      </Panel>
    </section>

    <section className="two-column overview-bottom">
      <Panel title="Лидеры station benchmark" subtitle="Средний Skill по 5 станциям и 14 горизонтам · больше лучше" right={<span className="small-tag">5 × 14</span>}>
        <div className="chart-area chart-short"><ResponsiveContainer width="100%" height="100%"><BarChart data={stationRows} layout="vertical" margin={{ top: 4, right: 17, bottom: 2, left: 5 }}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--chart-grid)" /><XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={113} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip content={<ChartTip />} /><ReferenceLine x={0} stroke="var(--muted)" /><Bar dataKey="skill" name="Mean skill" radius={[0, 4, 4, 0]} barSize={13}>{stationRows.map((row) => <Cell key={row.name} fill={row.color} />)}</Bar></BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Ключевые показатели текущего среза" subtitle={`${selected.station.label} · ${stationModel} · горизонт ${stationHorizon} дней`}>
        <div className="overview-stat-list"><div><span>MAE</span><b>{fmt(evaluation.metrics.mae)} °C</b><small>средняя абсолютная ошибка</small></div><div><span>RMSE</span><b>{fmt(evaluation.metrics.rmse)} °C</b><small>штраф за большие промахи</small></div><div><span>R²</span><b>{fmt(evaluation.metrics.r2, 3)}</b><small>относительно дисперсии факта</small></div><div><span>Skill vs persistence</span><b className={evaluation.metrics.skill >= 0 ? 'positive-text' : 'negative-text'}>{signed(evaluation.metrics.skill)}</b><small>{evaluation.metrics.skill >= 0 ? 'MAE ниже baseline' : 'MAE выше baseline'}</small></div></div>
      </Panel>
    </section>
  </div>
}

function ModelsPage({ cityIndex, cityVariable }: { cityIndex: number; cityVariable: CityVariableKey }) {
  const { weatherDemo, cityWeatherDemo } = useWeatherData()
  const weatherModels = weatherDemo.models
  const stationRanking = useMemo(() => weatherModels.map((model: any) => {
    const cells = weatherDemo.stationData.flatMap((station) => weatherDemo.horizons.map((h) => station.evaluations[model.name][h]))
    return { name: model.name, mae: mean(cells.map((cell) => cell.metrics.mae)), rmse: mean(cells.map((cell) => cell.metrics.rmse)), r2: mean(cells.map((cell) => cell.metrics.r2)), skill: mean(cells.map((cell) => cell.metrics.skill)), baseline: model.isBaseline }
  }).sort((a, b) => b.skill - a.skill), [])
  const cityRanking = useMemo(() => cityModelNames.map((name) => {
    const cells = cityWeatherDemo.cities.flatMap((_, ci) => cityVariables.map((variable) => evaluateCityModel(cityWeatherDemo, ci, variable.key, name)))
    return { name, skill: mean(cells.map((item) => item.skill)), mae: mean(cells.map((item) => item.mae)), rmse: mean(cells.map((item) => item.rmse)), r2: mean(cells.map((item) => item.r2)) }
  }).sort((a, b) => b.skill - a.skill), [])
  const cityRows = cityModelNames.map((name) => ({ name, ...evaluateCityModel(cityWeatherDemo, cityIndex, cityVariable, name) }))
  return <div className="content-stack">
    <section className="metrics-grid overview-metrics"><Metric label="Station benchmark" value="84" note="6 моделей × 14 горизонтов на станцию" icon={<BarChart3 size={16} />} /><Metric label="Station evaluations" value="420" note="5 станции × 84 комбинации" tone="green" icon={<Database size={16} />} /><Metric label="City evaluations" value="80" note="4 города × 5 переменных × 4 модели" tone="amber" icon={<CloudSun size={16} />} /><Metric label="Горизонты" value="1–14 дн." note="Подробная оценка на каждом горизонте" tone="purple" icon={<Activity size={16} />} /></section>
    <section className="two-column">
      <Panel title="Station benchmark · средний Skill" subtitle="Температурные станции · среднее по всем станциям и горизонтам"><div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={stationRanking} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} interval={0} angle={-16} textAnchor="end" height={55} /><YAxis tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip content={<ChartTip />} /><ReferenceLine y={0} stroke="var(--muted)" /><Bar dataKey="skill" name="Средний Skill" radius={[4, 4, 0, 0]}>{stationRanking.map((row) => <Cell key={row.name} fill={row.baseline ? 'var(--muted-2)' : row.skill >= 0 ? 'var(--c3)' : 'var(--c5)'} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
      <Panel title="City benchmark · средний Skill" subtitle="Все 4 города и 5 переменных · значения Skill усреднены по единицам задачи"><div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={cityRanking} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: 'var(--muted)', fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip content={<ChartTip />} /><ReferenceLine y={0} stroke="var(--muted)" /><Bar dataKey="skill" name="Средний Skill" radius={[4, 4, 0, 0]}>{cityRanking.map((row) => <Cell key={row.name} fill={row.skill >= 0 ? 'var(--c2)' : 'var(--c5)'} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
    </section>
    <Panel title="Метрики station benchmark" subtitle="Среднее по 5 станциям × 14 горизонтам · абсолютные ошибки в °C" right={<span className="small-tag">6 МОДЕЛЕЙ</span>}>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Модель</th><th>Тип</th><th>Mean MAE °C</th><th>Mean RMSE °C</th><th>Mean R²</th><th>Mean Skill</th></tr></thead><tbody>{stationRanking.map((row) => <tr key={row.name}><td><b>{row.name}</b></td><td>{row.baseline ? <span className="weather-baseline-tag">baseline</span> : 'ML'}</td><td>{fmt(row.mae)}</td><td>{fmt(row.rmse)}</td><td>{fmt(row.r2, 3)}</td><td className={row.skill >= 0 ? 'positive-text' : 'negative-text'}>{signed(row.skill)}</td></tr>)}</tbody></table></div>
      <div className="table-note"><Info size={13} /> Средняя MAE дана в пределах одной температурной задачи. Skill = 1 − MAE модели / MAE persistence; у самого Persistence он равен 0.</div>
    </Panel>
    <Panel title="Метрики city benchmark" subtitle="Среднее по 20 городо-параметрическим комбинациям; MAE/RMSE нельзя напрямую сравнивать между разными единицами" right={<span className="small-tag">4 МОДЕЛИ</span>}>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Модель</th><th>Mean MAE*</th><th>Mean RMSE*</th><th>Mean R²</th><th>Mean Skill</th></tr></thead><tbody>{cityRanking.map((row) => <tr key={row.name}><td><b>{row.name}</b>{row.name === 'Persistence' && <span className="weather-baseline-tag"> baseline</span>}</td><td>{fmt(row.mae)}</td><td>{fmt(row.rmse)}</td><td>{fmt(row.r2, 3)}</td><td className={row.skill >= 0 ? 'positive-text' : 'negative-text'}>{signed(row.skill)}</td></tr>)}</tbody></table></div>
      <div className="table-note"><Info size={13} /> * Среднее по °C, %, мм, м/с и гПа — только обзорное значение; для выбора алгоритма ориентируйтесь на Skill и сравнение одной переменной с одной размерностью.</div>
    </Panel>
    <Panel title="Срез выбранного городского параметра" subtitle="Все метрики рассчитаны на тех же 14 тестовых дней" right={<span className="small-tag">CITY / MODEL</span>}>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Модель</th><th>MAE</th><th>RMSE</th><th>R²</th><th>MAPE</th><th>Bias</th><th>Max error</th><th>MedAE</th><th>Skill</th></tr></thead><tbody>{cityRows.map((row) => <tr key={row.name}><td><b>{row.name}</b></td><td>{fmt(row.mae)}</td><td>{fmt(row.rmse)}</td><td>{fmt(row.r2, 3)}</td><td>{fmt(row.mape, 1)}%</td><td>{signed(row.bias)}</td><td>{fmt(row.maxError)}</td><td>{fmt(row.medae)}</td><td className={row.skill >= 0 ? 'positive-text' : 'negative-text'}>{signed(row.skill)}</td></tr>)}</tbody></table></div>
      <div className="table-note">City benchmark uses the current city and variable selection from the city page, defaulting to {cityWeatherDemo.cities[cityIndex]?.name} and {cityVariable}.</div>
    </Panel>
  </div>
}

function FeaturesPage() {
  const { weatherDemo } = useWeatherData()
  const featureImportance = weatherDemo.featureImportance
  const modelDescriptors = [
    { name: 'Persistence', group: 'Baseline · оба набора', equation: 'ŷ(t+h) = y(t)', description: 'Последнее доступное наблюдение; контрольная точка для Skill.' },
    { name: 'Seasonal Naive', group: 'Baseline · станции', equation: 'ŷ(t) = y(t−365)', description: 'Температура в тот же день предыдущего года.' },
    { name: 'Ridge', group: 'Регрессия · станции', equation: 'L2 regularization', description: 'Линейная модель с регуляризацией коэффициентов.' },
    { name: 'RandomForest', group: 'Ансамбль деревьев · станции', equation: 'RF(n=100, d=15)', description: 'Ансамбль деревьев решений для нелинейных зависимостей.' },
    { name: 'GradientBoosting', group: 'Бустинг · станции', equation: 'GBM(lr=0.05)', description: 'Последовательное уменьшение ошибки градиентным бустингом.' },
    { name: 'XGBoost', group: 'Бустинг · оба набора', equation: 'XGB(d=6, lr=0.05)', description: 'Градиентный бустинг с регуляризацией; встречается в обоих бенчмарках.' },
    { name: 'SARIMAX', group: 'Временные ряды · города', equation: 'Seasonal ARIMA + X', description: 'Классический подход для сезонных временных рядов.' },
    { name: 'LSTM', group: 'Нейросеть · города', equation: 'Long Short-Term Memory', description: 'Рекуррентная нейросеть, моделирующая последовательности.' },
  ]
  const metrics = [
    ['MAE', 'Средняя абсолютная ошибка', 'Меньше лучше; читается в единицах целевой переменной.'],
    ['RMSE', 'Корень средней квадратичной ошибки', 'Меньше лучше; сильнее штрафует крупные промахи.'],
    ['R²', 'Коэффициент детерминации', 'Ближе к 1 — лучше; отрицательное значение означает результат хуже предсказания средним.'],
    ['MAPE', 'Средняя абсолютная процентная ошибка', 'Относительная ошибка; неустойчива около нулевых значений. В температурном бенчмарке исключаются |факт| < 1 °C.'],
    ['Bias', 'Средняя signed-ошибка прогноза − факт', 'Положительное значение — модель в среднем завышает, отрицательное — занижает прогноз.'],
    ['Max error', 'Максимальная абсолютная ошибка', 'Самый большой промах на отложенной выборке.'],
    ['MedAE', 'Медианная абсолютная ошибка', 'Устойчивая к отдельным выбросам типичная ошибка.'],
    ['Skill', 'Выигрыш MAE относительно Persistence', 'Skill = 1 − MAE модели / MAE Persistence. Положительный — лучше baseline, отрицательный — хуже.'],
  ]
  return <div className="content-stack">
    <Panel title="Важность временных признаков" subtitle="Демонстрационный профиль для температурного ряда · сумма важностей равна 1,00" right={<span className="small-tag">FEATURE IMPORTANCE</span>}>
      <div className="chart-area feature-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={featureImportance} layout="vertical" margin={{ top: 5, right: 25, bottom: 5, left: 8 }}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--chart-grid)" /><XAxis type="number" domain={[0, 0.36]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={94} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip content={<ChartTip />} /><Bar dataKey="value" name="Importance" radius={[0, 5, 5, 0]} barSize={17}>{featureImportance.map((item, index) => <Cell key={item.name} fill={['var(--c2)', 'var(--c1)', 'var(--c3)', 'var(--c6)', 'var(--c4)', 'var(--c5)', 'var(--c2)', 'var(--c1)', 'var(--c3)', 'var(--c6)'][index]} />)}</Bar></BarChart></ResponsiveContainer></div>
      <div className="chart-footnote"><span>lag_1 и lag_2 отражают недавние наблюдения</span><span>roll_7 / roll_30 — скользящие агрегаты</span><span>doy_sin / doy_cos — сезонные координаты</span></div>
    </Panel>
    <Panel title="Каталог моделей" subtitle="Все уникальные типы алгоритмов, сохранённые из погодных референсов">
      <div className="model-catalog">{modelDescriptors.map((model, index) => <article className="model-catalog-card" key={model.name}><div className="model-catalog-index">{String(index + 1).padStart(2, '0')}</div><div className="model-catalog-body"><div className="model-catalog-top"><h3>{model.name}</h3><span className="small-tag">{model.group}</span></div><code>{model.equation}</code><p>{model.description}</p></div></article>)}</div>
    </Panel>
    <Panel title="Справочник метрик" subtitle="Интерпретация значений в таблицах и графиках">
      <div className="table-wrap"><table className="data-table metric-definitions"><thead><tr><th>Метрика</th><th>Что измеряет</th><th>Как читать</th></tr></thead><tbody>{metrics.map(([name, title, description]) => <tr key={name}><td><b>{name}</b></td><td>{title}</td><td>{description}</td></tr>)}</tbody></table></div>
    </Panel>
  </div>
}

export default function WeatherConsole() {
  return (
    <WeatherDataProvider>
      <WeatherConsoleInner />
    </WeatherDataProvider>
  )
}

function WeatherConsoleInner() {
  const { weatherDemo, cityWeatherDemo } = useWeatherData()
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const [activePage, setActivePage] = useState<Page>('overview')

  // Синхронизация с URL: ?page=overview|stations|cities|models|features
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search).get('page') as Page | null
    const allowed: Page[] = ['overview', 'stations', 'cities', 'models', 'features']
    if (p && allowed.includes(p)) setActivePage(p)
  }, [])
  const [stationId, setStationId] = useState(20891)
  const [stationModel, setStationModel] = useState('XGBoost')
  const [stationHorizon, setStationHorizon] = useState(7)
  const [showStationBaseline, setShowStationBaseline] = useState(true)
  const [showSkillCorridor, setShowSkillCorridor] = useState(true)
  const [sampleMode, setSampleMode] = useState<WeatherSampleMode>('accurate')
  const [cityIndex, setCityIndex] = useState(0)
  const [cityVariable, setCityVariable] = useState<CityVariableKey>('temp')
  const [cityModel, setCityModel] = useState('LSTM')
  const [showCityInterval, setShowCityInterval] = useState(true)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.theme = theme
  }, [theme])

  const selectedStation = weatherDemo.stationData.find((item) => item.station.id === stationId) ?? weatherDemo.stationData[0]
  const selectedEvaluation = selectedStation.evaluations[stationModel][stationHorizon]
  const selectedCity = cityWeatherDemo.cities[cityIndex] ?? cityWeatherDemo.cities[0]
  const selectedCityMetrics = evaluateCityModel(cityIndex, cityVariable, cityModel)

  const exportReport = () => {
    const stationRows = selectedEvaluation.points.map((point) => ({ date: point.date, actual_c: point.actual, forecast_c: point.predicted, error_c: point.error, abs_error_c: point.abs_error, within_mae: point.within_mae, outlier: point.is_outlier }))
    const cityVariableData = selectedCity.vars[cityVariable]
    const selectedCityForecast = cityVariableData.models.find((item) => item.name === cityModel) ?? cityVariableData.models[0]
    const future = Array.from({ length: cityWeatherDemo.forecastDays }, (_, offset) => {
      const index = cityWeatherDemo.nPast + offset
      return { date: selectedCity.dates[index], forecast: selectedCityForecast.forecast[index], interval_low: (selectedCityForecast.forecast[index] ?? 0) - 1.64 * (selectedCityForecast.sd[index] ?? 0), interval_high: (selectedCityForecast.forecast[index] ?? 0) + 1.64 * (selectedCityForecast.sd[index] ?? 0) }
    })
    const report = {
      title: 'Weather ML Console', source: 'synthetic demo data', generated_at: new Date().toISOString(),
      station_benchmark: { station: selectedStation.station, model: stationModel, horizon_days: stationHorizon, metrics: selectedEvaluation.metrics, predictions: stationRows },
      city_benchmark: { city: selectedCity.name, variable: cityVariable, model: cityModel, unit: cityVariables.find((item) => item.key === cityVariable)?.unit, metrics: selectedCityMetrics, backtest: cityVariableData.actual.slice(cityWeatherDemo.backStart, cityWeatherDemo.nPast).map((actual, offset) => ({ date: selectedCity.dates[cityWeatherDemo.backStart + offset], actual, predicted: selectedCityForecast.forecast[cityWeatherDemo.backStart + offset] })), future_forecast: future },
      station_skill_by_horizon: Object.fromEntries(weatherDemo.horizons.map((h) => [h, selectedStation.evaluations[stationModel][h].metrics.skill])),
      city_models: cityModelNames,
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `weather-ml-report-${selectedStation.station.id}-${stationModel}-h${stationHorizon}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const navItems: { id: Page; label: string; icon: typeof CloudSun; meta: string }[] = [
    { id: 'overview', label: 'Обзор', icon: LayoutDashboard, meta: 'сводка и KPI' },
    { id: 'stations', label: 'Станции', icon: Thermometer, meta: '1–14 дней · бэктест' },
    { id: 'cities', label: 'Города и переменные', icon: CloudSun, meta: '5 параметров погоды' },
    { id: 'models', label: 'Модели и метрики', icon: BarChart3, meta: 'лидерборды' },
    { id: 'features', label: 'Признаки и справочник', icon: Layers3, meta: 'features · метрики' },
  ]
  const activeMeta = pageMeta[activePage]
  const ActiveIcon = activeMeta.icon

  return <div className="mlr-root app-shell" data-theme={theme}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><CloudSun size={21} /></div><div className="brand-text">Weather ML Console<span>Forecasting · Model Quality</span></div></div>
      <div className="nav-caption">ПОГОДНЫЙ КОНТУР</div>
      <nav className="nav-stack" aria-label="Навигация по погоде">{navItems.map((item) => {
        const Icon = item.icon
        return <button type="button" key={item.id} className={`nav-item ${activePage === item.id ? 'selected' : ''}`} onClick={() => setActivePage(item.id)} aria-current={activePage === item.id ? 'page' : undefined}><Icon size={17} /><span className="nav-label">{item.label}<small>{item.meta}</small></span>{activePage === item.id && <span className="nav-pip" />}</button>
      })}</nav>
      <div className="sidebar-bottom"><div className="source-card"><span className="source-dot" /><div><b>DEMO DATASET</b><span>локальная генерация · API не требуется</span></div></div><div className="sidebar-note">Только погодные разделы. Не является системой оперативного метеопрогноза.</div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><ActiveIcon size={15} /><span>Weather ML</span><span className="crumb-slash">/</span><b>{activeMeta.title}</b></div><div className="top-actions"><span className="data-badge"><i className="status-dot" /> SYNTHETIC DEMO</span><button type="button" className="button button-quiet" onClick={exportReport}><Download size={14} /> Экспорт JSON</button><button type="button" className="icon-button" title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'} aria-label="Переключить тему" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button><button type="button" className="icon-button" title="Печать / сохранить PDF" aria-label="Печать" onClick={() => window.print()}><Printer size={15} /></button></div></header>
      <div className="page-content">
        <div className="page-title-row"><div><div className="eyebrow">WEATHER / {activePage.toUpperCase()}</div><h1>{activeMeta.title}</h1><p>{activeMeta.subtitle}</p></div></div>
        <section className="module-tabs" aria-label="Раздел погоды">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.id}
                className={`module-tab ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
                aria-current={activePage === item.id ? 'page' : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                <small>{item.meta}</small>
              </button>
            )
          })}
        </section>
        {activePage === 'overview' && <OverviewPage stationId={stationId} stationModel={stationModel} stationHorizon={stationHorizon} cityIndex={cityIndex} />}
        {activePage === 'stations' && <WeatherDashboard stationId={stationId} setStationId={setStationId} modelName={stationModel} setModelName={setStationModel} horizon={stationHorizon} setHorizon={setStationHorizon} showBaseline={showStationBaseline} setShowBaseline={setShowStationBaseline} showSkillCorridor={showSkillCorridor} setShowSkillCorridor={setShowSkillCorridor} sampleMode={sampleMode} setSampleMode={setSampleMode} />}
        {activePage === 'cities' && <CityWeatherDashboard cityIndex={cityIndex} setCityIndex={setCityIndex} variableKey={cityVariable} setVariableKey={setCityVariable} modelName={cityModel} setModelName={setCityModel} showInterval={showCityInterval} setShowInterval={setShowCityInterval} />}
        {activePage === 'models' && <ModelsPage cityIndex={cityIndex} cityVariable={cityVariable} />}
        {activePage === 'features' && <FeaturesPage />}
        <footer className="page-footer"><span>Weather ML Console <span className="footer-separator">/</span> forecasting &amp; model evaluation</span></footer>
      </div>
    </main>
  </div>
}