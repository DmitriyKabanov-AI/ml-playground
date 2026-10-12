
export type WeatherStation = {
  id: number
  label: string
  lat: number
  lon: number
  meanT: number
  seasonalAmp: number
  noise: number
}

export type WeatherDay = { date: string; actual: number; holiday?: string; anomaly?: boolean }

export type WeatherModelSpec = {
  name: string
  noise: number
  bias: number
  isBaseline: boolean
  model: string
  description: string
}

export type WeatherMetrics = {
  mae: number
  rmse: number
  r2: number
  mape: number
  bias: number
  maxError: number
  medae: number
  skill: number
}

export type WeatherPrediction = {
  date: string
  actual: number
  predicted: number
  error: number
  abs_error: number
  within_mae: boolean
  is_outlier: boolean
}

export type WeatherEvaluation = {
  horizon: number
  model: string
  points: WeatherPrediction[]
  metrics: WeatherMetrics
  deltaVsPersistence: number
}

export type WeatherStationDataset = {
  station: WeatherStation
  series: WeatherDay[]
  testStart: number
  evaluations: Record<string, Record<number, WeatherEvaluation>>
}

const DAY_MS = 86_400_000
const SERIES_LENGTH = 1460
const TRAIN_COUNT = 1095
const TEST_DAYS = SERIES_LENGTH - TRAIN_COUNT
const HORIZONS = Array.from({ length: 14 }, (_, index) => index + 1)

export const stations: WeatherStation[] = [
  { id: 20891, label: 'Север', lat: 72.0, lon: 102.5, meanT: -11.7, seasonalAmp: 22, noise: 4.0 },
  { id: 30949, label: 'Юг', lat: 49.6, lon: 112.0, meanT: -0.3, seasonalAmp: 14, noise: 3.2 },
  { id: 20107, label: 'Запад', lat: 78.1, lon: 14.2, meanT: -4.1, seasonalAmp: 10, noise: 2.8 },
  { id: 21432, label: 'Сибирь', lat: 76.0, lon: 137.9, meanT: -13.5, seasonalAmp: 20, noise: 4.5 },
  { id: 27051, label: 'Центр', lat: 59.9, lon: 42.8, meanT: 3.0, seasonalAmp: 15, noise: 3.0 },
]

export const weatherModels: WeatherModelSpec[] = [
  { name: 'Persistence', noise: 0, bias: 0, isBaseline: true, model: 'ŷ(t+h)=y(t)', description: 'Последнее наблюдение без поправки на сезонность' },
  { name: 'Seasonal Naive', noise: 0, bias: 0, isBaseline: true, model: 'ŷ(t)=y(t−365)', description: 'Температура в тот же день предыдущего года' },
  { name: 'Ridge', noise: 0.26, bias: 0.002, isBaseline: false, model: 'Ridge(α=1)', description: 'Линейная модель с L2-регуляризацией' },
  { name: 'RandomForest', noise: 0.24, bias: -0.003, isBaseline: false, model: 'RF(n=100, d=15)', description: 'Ансамбль деревьев решений' },
  { name: 'GradientBoosting', noise: 0.21, bias: 0.001, isBaseline: false, model: 'GBM(lr=0.05)', description: 'Последовательный градиентный бустинг' },
  { name: 'XGBoost', noise: 0.19, bias: 0, isBaseline: false, model: 'XGB(d=6, lr=0.05)', description: 'Градиентный бустинг с регуляризацией' },
]

export const featureImportance = [
  { name: 'lag_1', value: 0.34 },
  { name: 'lag_2', value: 0.14 },
  { name: 'roll_7', value: 0.12 },
  { name: 'doy_sin', value: 0.09 },
  { name: 'doy_cos', value: 0.08 },
  { name: 'lag_365', value: 0.07 },
  { name: 'roll_30', value: 0.06 },
  { name: 'lag_7', value: 0.05 },
  { name: 'month_sin', value: 0.03 },
  { name: 'lag_30', value: 0.02 },
]

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export function mean(values: number[]) {
  return values.length ? sum(values) / values.length : 0
}

export function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gaussian(random: () => number) {
  let u = 0
  let v = 0
  while (!u) u = random()
  while (!v) v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function calculateMetrics(yTrue: number[], yPred: number[], persistenceMae = 0): Omit<WeatherMetrics, 'skill'> & { skill: number } {
  const n = Math.min(yTrue.length, yPred.length)
  if (!n) return { mae: 0, rmse: 0, r2: 0, mape: 0, bias: 0, maxError: 0, medae: 0, skill: 0 }
  const actual = yTrue.slice(0, n)
  const predicted = yPred.slice(0, n)
  const errors = predicted.map((value, index) => value - actual[index])
  const absoluteErrors = errors.map(Math.abs)
  const actualMean = mean(actual)
  const ssResidual = sum(errors.map((value) => value ** 2))
  const ssTotal = sum(actual.map((value) => (value - actualMean) ** 2))
  // MAPE is undefined around 0 °C, so exclude observations inside a ±1 °C band.
  const relativeErrors = actual.map((value, index) => Math.abs(value) >= 1 ? absoluteErrors[index] / Math.abs(value) : null)
    .filter((value): value is number => value != null)
  const mae = mean(absoluteErrors)
  return {
    mae,
    rmse: Math.sqrt(ssResidual / n),
    r2: ssTotal ? 1 - ssResidual / ssTotal : 0,
    mape: relativeErrors.length ? mean(relativeErrors) * 100 : 0,
    bias: mean(errors),
    maxError: Math.max(...absoluteErrors),
    medae: median(absoluteErrors),
    skill: persistenceMae > 0 ? 1 - mae / persistenceMae : 0,
  }
}

function dateAt(startTime: number, index: number) {
  return new Date(startTime + index * DAY_MS).toISOString().slice(0, 10)
}

export function generateStationSeries(station: WeatherStation, seed: number): WeatherDay[] {
  const random = mulberry32(seed + station.id)
  const startTime = Date.UTC(2021, 0, 1)
  const phase = ((station.id % 29) / 29) * Math.PI * 2
  let correlatedNoise = 0
  return Array.from({ length: SERIES_LENGTH }, (_, index) => {
    const date = dateAt(startTime, index)
    const dayOfYear = (index % 365.25)
    const seasonal = station.seasonalAmp * Math.sin((2 * Math.PI * dayOfYear) / 365.25 + phase)
    const trend = 0.03 * (index / 365.25)
    // Mild AR(1) weather persistence keeps adjacent-day temperatures correlated.
    correlatedNoise = 0.85 * correlatedNoise + Math.sqrt(1 - 0.85 ** 2) * gaussian(random)
    const anomaly = random() < 0.015
    const anomalyShift = anomaly ? (random() < 0.5 ? -1 : 1) * (8 + random() * 4) : 0
    const actual = station.meanT + seasonal + trend + station.noise * correlatedNoise + anomalyShift
    const mmdd = date.slice(5)
    const holiday = mmdd === '01-01' ? 'Новый год' : mmdd === '07-01' ? 'Середина года' : undefined
    return { date, actual: Math.round(actual * 100) / 100, ...(holiday ? { holiday } : {}), ...(anomaly ? { anomaly: true } : {}) }
  })
}

function buildStationData(station: WeatherStation): WeatherStationDataset {
  const series = generateStationSeries(station, 20261009)
  const evaluationsRaw: Record<string, Record<number, { date: string; actual: number; predicted: number }[]>> = {}
  weatherModels.forEach((model) => { evaluationsRaw[model.name] = {} })

  for (const horizon of HORIZONS) {
    const pointCount = TEST_DAYS - horizon + 1
    const commonPoints = Array.from({ length: pointCount }, (_, i) => {
      const targetIndex = TRAIN_COUNT + i + horizon - 1
      const originIndex = targetIndex - horizon
      return { date: series[targetIndex].date, actual: series[targetIndex].actual, origin: series[originIndex].actual, seasonal: series[targetIndex - 365].actual, targetIndex }
    })

    const persistence = commonPoints.map((point) => ({ date: point.date, actual: point.actual, predicted: point.origin }))
    const seasonalNaive = commonPoints.map((point) => ({ date: point.date, actual: point.actual, predicted: point.seasonal }))
    evaluationsRaw.Persistence[horizon] = persistence
    evaluationsRaw['Seasonal Naive'][horizon] = seasonalNaive

    weatherModels.filter((model) => !model.isBaseline).forEach((model, modelIndex) => {
      const random = mulberry32(station.id * 31 + horizon * 101 + modelIndex * 997 + 13)
      const horizonNoise = model.noise * (1 + 0.06 * (horizon - 1))
      // Noise parameters are dimensionless in this demo; scale them by station volatility
      // to produce readable errors in Celsius while keeping the requested horizon decay.
      const sigma = horizonNoise * station.noise * 2.9
      const bias = model.bias * station.noise * horizon
      evaluationsRaw[model.name][horizon] = commonPoints.map((point) => ({
        date: point.date,
        actual: point.actual,
        predicted: point.actual + bias + gaussian(random) * sigma,
      }))
    })
  }

  const evaluations: Record<string, Record<number, WeatherEvaluation>> = {}
  for (const model of weatherModels) {
    evaluations[model.name] = {}
    for (const horizon of HORIZONS) {
      const rows = evaluationsRaw[model.name][horizon]
      const actuals = rows.map((row) => row.actual)
      const preds = rows.map((row) => row.predicted)
      const persistenceMetrics = calculateMetrics(
        evaluationsRaw.Persistence[horizon].map((row) => row.actual),
        evaluationsRaw.Persistence[horizon].map((row) => row.predicted),
      )
      const metrics = calculateMetrics(actuals, preds, persistenceMetrics.mae)
      const points: WeatherPrediction[] = rows.map((row) => {
        const error = row.predicted - row.actual
        const abs_error = Math.abs(error)
        return {
          date: row.date,
          actual: Math.round(row.actual * 100) / 100,
          predicted: Math.round(row.predicted * 100) / 100,
          error: Math.round(error * 100) / 100,
          abs_error: Math.round(abs_error * 100) / 100,
          within_mae: abs_error <= metrics.mae,
          is_outlier: abs_error > metrics.mae * 2.5,
        }
      })
      evaluations[model.name][horizon] = {
        horizon,
        model: model.name,
        points,
        metrics,
        deltaVsPersistence: metrics.mae - persistenceMetrics.mae,
      }
    }
  }

  return { station, series, testStart: TRAIN_COUNT, evaluations }
}

export const weatherDemo = {
  section: 'forecasting-weather',
  source: 'synthetic demo data',
  stations,
  models: weatherModels,
  horizons: HORIZONS,
  stationData: stations.map(buildStationData),
  featureImportance,
  seriesLength: SERIES_LENGTH,
  trainCount: TRAIN_COUNT,
  testDays: TEST_DAYS,
}

export function meanSkillForModel(stationData: WeatherStationDataset, modelName: string) {
  return mean(HORIZONS.map((horizon) => stationData.evaluations[modelName][horizon].metrics.skill))
}

export function meanSkillForStation(stationData: WeatherStationDataset, modelName?: string) {
  const selectedModels = modelName ? [modelName] : weatherModels.filter((model) => !model.isBaseline).map((model) => model.name)
  return mean(selectedModels.flatMap((name) => HORIZONS.map((horizon) => stationData.evaluations[name][horizon].metrics.skill)))
}
