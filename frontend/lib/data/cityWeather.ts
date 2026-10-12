import { gaussian, mean, mulberry32, median, sum } from './demoWeather'

export type CityVariableKey = 'temp' | 'hum' | 'rain' | 'wind' | 'pres'
export type CityInfo = { name: string; mean: number; amp: number; hum: number; wind: number; pres: number; rainProb: number; volatility: number }
export type CityVariableSpec = { key: CityVariableKey; label: string; unit: string; icon: string; errorScale: [number, number, number] }
export type CityForecastModel = { name: string; forecast: (number | null)[]; sd: (number | null)[] }
export type CityVariableData = { actual: number[]; models: CityForecastModel[]; leadMae: Record<string, number[]> }
export type CityDataset = { name: string; dates: string[]; vars: Record<CityVariableKey, CityVariableData> }
export type CityMetrics = { mae: number; rmse: number; r2: number; mape: number; bias: number; maxError: number; medae: number; skill: number }
export type CityEvaluationPoint = { date: string; actual: number; predicted: number; error: number; absError: number; low: number | null; high: number | null }

export const citySpecs: CityInfo[] = [
  { name: 'Москва', mean: 5.8, amp: 13, hum: 78, wind: 3.6, pres: 1012, rainProb: 0.45, volatility: 1.15 },
  { name: 'Алматы', mean: 10.5, amp: 14, hum: 58, wind: 2.4, pres: 1015, rainProb: 0.22, volatility: 1.0 },
  { name: 'Нью-Йорк', mean: 12.8, amp: 12, hum: 64, wind: 4.8, pres: 1016, rainProb: 0.33, volatility: 1.1 },
  { name: 'Дубай', mean: 27.5, amp: 8.5, hum: 55, wind: 4.2, pres: 1008, rainProb: 0.03, volatility: 0.55 },
]

export const cityVariables: CityVariableSpec[] = [
  { key: 'temp', label: 'Температура', unit: '°C', icon: '🌡️', errorScale: [1.9, 1.5, 1.25] },
  { key: 'hum', label: 'Влажность', unit: '%', icon: '💧', errorScale: [7.5, 6, 5.2] },
  { key: 'rain', label: 'Осадки', unit: 'мм', icon: '🌧️', errorScale: [3.2, 2.7, 2.4] },
  { key: 'wind', label: 'Ветер', unit: 'м/с', icon: '💨', errorScale: [1.7, 1.4, 1.2] },
  { key: 'pres', label: 'Давление', unit: 'гПа', icon: '🧭', errorScale: [4.6, 3.7, 3.2] },
]

export const cityModelNames = ['Persistence', 'SARIMAX', 'XGBoost', 'LSTM'] as const
export const CITY_N = 66
export const CITY_PAST = 59
export const CITY_BACK_START = 45
export const CITY_ORIGIN = 44

function clampFor(key: CityVariableKey, value: number) {
  if (key === 'hum') return Math.max(15, Math.min(100, value))
  if (key === 'rain' || key === 'wind') return Math.max(0, value)
  return value
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function makeDates() {
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Array.from({ length: CITY_N }, (_, index) => toDateKey(new Date(today + (index - 58) * 86_400_000)))
}

function dayOfYear(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  return Math.floor((d.getTime() - start) / 86_400_000)
}

function metricSet(actual: number[], predicted: number[], baselineMae = 0): CityMetrics {
  const n = Math.min(actual.length, predicted.length)
  if (!n) return { mae: 0, rmse: 0, r2: 0, mape: 0, bias: 0, maxError: 0, medae: 0, skill: 0 }
  const y = actual.slice(0, n)
  const p = predicted.slice(0, n)
  const err = p.map((value, i) => value - y[i])
  const absErr = err.map(Math.abs)
  const yMean = mean(y)
  const ssr = sum(err.map((value) => value * value))
  const sst = sum(y.map((value) => (value - yMean) ** 2))
  // Mirrors the city benchmark in test.html: zero-valued actuals contribute 0 to MAPE.
  const relative = y.map((value, i) => value ? absErr[i] / Math.abs(value) : 0)
  const mae = mean(absErr)
  return {
    mae,
    rmse: Math.sqrt(ssr / n),
    r2: sst ? 1 - ssr / sst : 0,
    mape: mean(relative) * 100,
    bias: mean(err),
    maxError: Math.max(...absErr),
    medae: median(absErr),
    skill: baselineMae > 0 ? 1 - mae / baselineMae : 0,
  }
}

function buildCity(city: CityInfo, cityIndex: number, dates: string[]): CityDataset {
  const random = mulberry32(40 + cityIndex)
  const anomaly: number[] = []
  let drift = 0
  for (let i = 0; i < CITY_N; i += 1) {
    drift = 0.82 * drift + gaussian(random) * 1.7 * city.volatility
    anomaly.push(drift)
  }

  const actualByVariable: Record<CityVariableKey, number[]> = { temp: [], hum: [], rain: [], wind: [], pres: [] }
  for (let i = 0; i < CITY_N; i += 1) {
    const temp = city.mean + city.amp * Math.sin((2 * Math.PI * (dayOfYear(dates[i]) - 110)) / 365) + anomaly[i]
    const humidity = Math.min(100, Math.max(15, city.hum - 1.4 * anomaly[i] + gaussian(random) * 5))
    const rainy = random() < city.rainProb * (humidity > city.hum ? 1.4 : 0.6)
    const rain = rainy ? -Math.log(Math.max(random(), 1e-9)) * 4 : 0
    const wind = Math.max(0.3, city.wind + gaussian(random) * 1.4 + (rainy ? 1.2 : 0))
    const pressure = city.pres + anomaly[i] * 0.9 + gaussian(random) * 2
    actualByVariable.temp.push(Number(temp.toFixed(1)))
    actualByVariable.hum.push(Number(humidity.toFixed(1)))
    actualByVariable.rain.push(Number(rain.toFixed(1)))
    actualByVariable.wind.push(Number(wind.toFixed(1)))
    actualByVariable.pres.push(Number(pressure.toFixed(1)))
  }

  const vars = {} as Record<CityVariableKey, CityVariableData>
  cityVariables.forEach((variable) => {
    const actual = actualByVariable[variable.key]
    const models: CityForecastModel[] = []
    const lead = (i: number) => i <= 58 ? i - CITY_ORIGIN : i - 58
    const lagSd = (l: number) => {
      const diffs = actual.slice(l).map((value, i) => value - actual[i])
      const avg = mean(diffs)
      return Math.sqrt(mean(diffs.map((value) => (value - avg) ** 2)))
    }

    const persistenceForecast: (number | null)[] = Array(CITY_N).fill(null)
    const persistenceSd: (number | null)[] = Array(CITY_N).fill(null)
    for (let i = CITY_BACK_START; i < CITY_N; i += 1) {
      persistenceForecast[i] = i <= 58 ? actual[CITY_ORIGIN] : actual[58]
      persistenceSd[i] = lagSd(Math.min(lead(i), 40))
    }
    models.push({ name: 'Persistence', forecast: persistenceForecast, sd: persistenceSd })

    const networkModels = ['SARIMAX', 'XGBoost', 'LSTM']
    networkModels.forEach((name, modelIndex) => {
      const rng = mulberry32(700 + cityIndex * 50 + modelIndex + variable.key.length * 7)
      const forecast: (number | null)[] = Array(CITY_N).fill(null)
      const sd: (number | null)[] = Array(CITY_N).fill(null)
      for (let i = CITY_BACK_START; i < CITY_N; i += 1) {
        const scale = variable.errorScale[modelIndex] * (0.45 + 0.1 * lead(i))
        sd[i] = scale
        forecast[i] = Number(clampFor(variable.key, actual[i] + gaussian(rng) * scale).toFixed(1))
      }
      models.push({ name, forecast, sd })
    })

    const leadMae: Record<string, number[]> = {
      Persistence: [1, 2, 3, 4, 5, 6, 7].map((h) => mean(actual.slice(h).map((value, i) => Math.abs(value - actual[i])))),
    }
    networkModels.forEach((name, modelIndex) => {
      leadMae[name] = [1, 2, 3, 4, 5, 6, 7].map((h) => 0.798 * variable.errorScale[modelIndex] * (0.45 + 0.1 * h))
    })
    vars[variable.key] = { actual, models, leadMae }
  })
  return { name: city.name, dates, vars }
}

export const cityWeatherDemo = (() => {
  const dates = makeDates()
  return {
    source: 'synthetic demo data',
    dates,
    nPast: CITY_PAST,
    backStart: CITY_BACK_START,
    origin: CITY_ORIGIN,
    forecastDays: CITY_N - CITY_PAST,
    cities: citySpecs.map((city, index) => buildCity(city, index, dates)),
  }
})()

export function evaluateCityModel(cityIndex: number, variableKey: CityVariableKey, modelName: string): CityMetrics {
  const city = cityWeatherDemo.cities[cityIndex] ?? cityWeatherDemo.cities[0]
  const variable = city.vars[variableKey]
  const model = variable.models.find((item) => item.name === modelName) ?? variable.models[0]
  const actual = variable.actual.slice(cityWeatherDemo.backStart, cityWeatherDemo.nPast)
  const predicted = model.forecast.slice(cityWeatherDemo.backStart, cityWeatherDemo.nPast).map((value) => value ?? 0)
  const persistence = variable.models[0]
  const baselineActual = actual
  const baselinePredicted = persistence.forecast.slice(cityWeatherDemo.backStart, cityWeatherDemo.nPast).map((value) => value ?? 0)
  const baselineMae = metricSet(baselineActual, baselinePredicted).mae
  return metricSet(actual, predicted, baselineMae)
}

export function cityEvaluationPoints(cityIndex: number, variableKey: CityVariableKey, modelName: string): CityEvaluationPoint[] {
  const city = cityWeatherDemo.cities[cityIndex] ?? cityWeatherDemo.cities[0]
  const variable = city.vars[variableKey]
  const model = variable.models.find((item) => item.name === modelName) ?? variable.models[0]
  const low = cityWeatherDemo.backStart
  const high = cityWeatherDemo.nPast
  const metrics = evaluateCityModel(cityIndex, variableKey, modelName)
  return Array.from({ length: high - low }, (_, j) => {
    const i = low + j
    const actual = variable.actual[i]
    const predicted = model.forecast[i] ?? actual
    const sd = model.sd[i] ?? 0
    return {
      date: city.dates[i], actual, predicted,
      error: predicted - actual,
      absError: Math.abs(predicted - actual),
      low: predicted - 1.64 * sd,
      high: predicted + 1.64 * sd,
    }
  }).map((point) => ({ ...point, error: Number(point.error.toFixed(2)), absError: Number(point.absError.toFixed(2)) }))
}

export function cityDateTick(iso: string) {
  const parts = iso.split('-')
  return `${parts[2]}.${parts[1]}`
}

export function cityWeatherIcon(rain: number, temp: number, humidity: number) {
  return rain >= 1 ? (temp <= 0 ? '🌨️' : '🌧️') : humidity > 80 ? '☁️' : humidity > 62 ? '⛅' : '☀️'
}
