export type MetricSummary = {
  mae: number
  rmse: number
  r2: number
  mape: number
  bias: number
  maxError: number
}

export type RegressionModel = {
  name: string
  pred: number[]
  metrics: MetricSummary
  noise: number
}

export type RegressionDemo = {
  target: string
  y: number[]
  models: RegressionModel[]
  importance: { name: string; value: number }[]
}

export type Holiday = { date: string; icon: string; label: string }
export type WalmartModel = {
  name: string
  forecast: (number | null)[]
  lo: (number | null)[]
  hi: (number | null)[]
  metrics: MetricSummary & { wmae: number }
}
export type WalmartStore = {
  name: string
  factor: number
  dates: string[]
  actual: (number | null)[]
  models: WalmartModel[]
}
export type WalmartDemo = {
  testStart: number
  historicalCount: number
  holidays: Holiday[]
  dates: string[]
  stores: WalmartStore[]
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const mean = (values: number[]) => values.length ? sum(values) / values.length : 0

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(random: () => number) {
  let u = 0
  let v = 0
  while (!u) u = random()
  while (!v) v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function calculateMetrics(actual: number[], predicted: number[]): MetricSummary {
  const length = Math.min(actual.length, predicted.length)
  const a = actual.slice(0, length)
  const p = predicted.slice(0, length)
  const errors = a.map((value, index) => p[index] - value)
  const average = mean(a)
  const ssResidual = sum(errors.map((error) => error * error))
  const ssTotal = sum(a.map((value) => (value - average) ** 2))
  return {
    mae: mean(errors.map(Math.abs)),
    rmse: Math.sqrt(ssResidual / Math.max(1, length)),
    r2: ssTotal ? 1 - ssResidual / ssTotal : 0,
    mape: mean(a.map((value, index) => value ? Math.abs(errors[index]) / Math.abs(value) : 0)) * 100,
    bias: mean(errors),
    maxError: Math.max(0, ...errors.map(Math.abs)),
  }
}

export const regressionDemo: RegressionDemo = (() => {
  const random = mulberry32(77)
  const count = 260
  const y: number[] = []
  for (let i = 0; i < count; i++) {
    const z = Array.from({ length: 6 }, () => gaussian(random))
    const value = 240 + 58 * z[0] + 16 * z[1] - 24 * z[2] - 34 * z[3] + 40 * z[4] + 22 * z[5] + 11 * z[0] * z[4] + gaussian(random) * 14
    y.push(Math.max(35, Math.round(value * 10) / 10))
  }
  const average = mean(y)
  const specs: [string, number, number][] = [
    ['Linear Regression', 27, 0.94],
    ['Ridge', 26, 0.93],
    ['Lasso', 27.5, 0.93],
    ['Random Forest', 17, 0.97],
    ['Gradient Boosting', 13.5, 0.985],
    ['XGBoost', 12, 0.99],
  ]
  const models = specs.map(([name, noise, shrink], index) => {
    const rand = mulberry32(100 + index)
    const pred = y.map((value) => +(average + (value - average) * shrink + gaussian(rand) * noise).toFixed(1))
    return { name, pred, metrics: calculateMetrics(y, pred), noise }
  })
  return {
    target: 'Цена объекта, $ тыс.',
    y,
    models,
    importance: [
      { name: 'Площадь', value: 0.36 },
      { name: 'Доход района', value: 0.2 },
      { name: 'Расстояние до центра', value: 0.15 },
      { name: 'Качество отделки', value: 0.13 },
      { name: 'Возраст объекта', value: 0.1 },
      { name: 'Комнаты', value: 0.06 },
    ],
  }
})()

export type DiamondCut = 'Fair' | 'Good' | 'Very Good' | 'Premium' | 'Ideal'
export type DiamondColor = 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
export type DiamondClarity = 'IF' | 'VVS1' | 'VVS2' | 'VS1' | 'VS2' | 'SI1' | 'SI2' | 'I1'
export type DiamondInputs = {
  carat: number
  cut: DiamondCut
  color: DiamondColor
  clarity: DiamondClarity
  depth: number
  table: number
  x: number
  y: number
  z: number
}
export type DiamondSample = DiamondInputs & { price: number }
export type DiamondsDemo = {
  target: string
  samples: DiamondSample[]
  y: number[]
  models: RegressionModel[]
  importance: { name: string; value: number }[]
}

const diamondCutFactors: Record<DiamondCut, number> = {
  Fair: 0.78,
  Good: 0.9,
  'Very Good': 1,
  Premium: 1.075,
  Ideal: 1.11,
}
const diamondColorFactors: Record<DiamondColor, number> = {
  D: 1.12, E: 1.085, F: 1.055, G: 1.02, H: 0.98, I: 0.935, J: 0.88,
}
const diamondClarityFactors: Record<DiamondClarity, number> = {
  IF: 1.18, VVS1: 1.145, VVS2: 1.11, VS1: 1.07, VS2: 1.025, SI1: 0.96, SI2: 0.885, I1: 0.76,
}

export function calculateDiamondPrice(input: DiamondInputs): number {
  const carat = Math.max(0.1, input.carat)
  const expectedScale = Math.cbrt(carat)
  const expectedVolume = (6.5 * expectedScale) * (6.5 * expectedScale) * (3.9 * expectedScale)
  const actualVolume = Math.max(0.1, input.x * input.y * input.z)
  const volumeRatio = actualVolume / Math.max(0.1, expectedVolume)
  const dimensionFactor = Math.max(0.9, Math.min(1.1, 1 + (volumeRatio - 1) * 0.45))
  const depthFactor = Math.max(0.84, 1 - Math.abs(input.depth - 61.5) * 0.009)
  const tableFactor = Math.max(0.88, 1 - Math.abs(input.table - 57) * 0.006)
  const base = 350 + 4600 * Math.pow(carat, 1.7)
  return Math.max(100, base
    * diamondCutFactors[input.cut]
    * diamondColorFactors[input.color]
    * diamondClarityFactors[input.clarity]
    * dimensionFactor * depthFactor * tableFactor)
}

export const diamondsDemo: DiamondsDemo = (() => {
  const random = mulberry32(404)
  const cuts: DiamondCut[] = ['Fair', 'Good', 'Very Good', 'Premium', 'Ideal']
  const colors: DiamondColor[] = ['D', 'E', 'F', 'G', 'H', 'I', 'J']
  const clarities: DiamondClarity[] = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1']
  const samples: DiamondSample[] = Array.from({ length: 360 }, () => {
    const carat = Number((0.2 + Math.pow(random(), 1.55) * 2.8).toFixed(2))
    const scale = Math.cbrt(carat)
    const input: DiamondInputs = {
      carat,
      cut: cuts[Math.min(cuts.length - 1, Math.floor(random() * cuts.length))],
      color: colors[Math.min(colors.length - 1, Math.floor(random() * colors.length))],
      clarity: clarities[Math.min(clarities.length - 1, Math.floor(random() * clarities.length))],
      depth: Number((55 + random() * 12).toFixed(1)),
      table: Number((52 + random() * 12).toFixed(1)),
      x: Number((6.5 * scale * (0.97 + random() * 0.06)).toFixed(2)),
      y: Number((6.5 * scale * (0.97 + random() * 0.06)).toFixed(2)),
      z: Number((3.9 * scale * (0.94 + random() * 0.12)).toFixed(2)),
    }
    const price = Math.max(100, Math.round(calculateDiamondPrice(input) * (1 + gaussian(random) * 0.085)))
    return { ...input, price }
  })
  const y = samples.map((sample) => sample.price)
  const modelSpecs: [string, number, number][] = [
    ['Linear Regression', 0.205, -0.012],
    ['Ridge', 0.185, -0.006],
    ['Lasso', 0.19, -0.009],
    ['Random Forest', 0.125, 0.002],
    ['Gradient Boosting', 0.09, 0.001],
    ['XGBoost', 0.075, 0],
  ]
  const models = modelSpecs.map(([name, noise, bias], modelIndex) => {
    const modelRandom = mulberry32(800 + modelIndex)
    const pred = samples.map((sample) => Math.max(100, Math.round(calculateDiamondPrice(sample) * (1 + bias + gaussian(modelRandom) * noise))))
    return { name, pred, metrics: calculateMetrics(y, pred), noise }
  })
  return {
    target: 'Цена бриллианта, $',
    samples,
    y,
    models,
    importance: [
      { name: 'Каратность', value: 0.43 },
      { name: 'Чистота', value: 0.17 },
      { name: 'Цвет', value: 0.12 },
      { name: 'Размеры (x/y/z)', value: 0.11 },
      { name: 'Огранка', value: 0.09 },
      { name: 'Глубина', value: 0.045 },
      { name: 'Table', value: 0.035 },
    ],
  }
})()

const holidayData: Holiday[] = [
  ['2010-02-12', '🏈', 'Super Bowl'], ['2010-09-10', '🇺🇸', 'Labor Day'], ['2010-11-26', '🦃', 'Thanksgiving'], ['2010-12-31', '🎄', 'Christmas'],
  ['2011-02-11', '🏈', 'Super Bowl'], ['2011-09-09', '🇺🇸', 'Labor Day'], ['2011-11-25', '🦃', 'Thanksgiving'], ['2011-12-30', '🎄', 'Christmas'],
  ['2012-02-10', '🏈', 'Super Bowl'], ['2012-09-07', '🇺🇸', 'Labor Day'], ['2012-11-23', '🦃', 'Thanksgiving'], ['2012-12-28', '🎄', 'Christmas'], ['2013-02-08', '🏈', 'Super Bowl'],
].map(([date, icon, label]) => ({ date, icon, label }))

export const walmartDemo: WalmartDemo = (() => {
  const historicalCount = 143
  const testStart = 117
  const total = historicalCount + 13
  const startTime = Date.UTC(2010, 1, 5)
  const dates = Array.from({ length: total }, (_, index) => new Date(startTime + index * 7 * 86400000).toISOString().slice(0, 10))
  const clean = (index: number) => {
    const date = new Date(`${dates[index]}T00:00:00Z`)
    const month = date.getUTCMonth() + 1
    const day = date.getUTCDate()
    let value = 1 + 0.07 * Math.sin((2 * Math.PI * index) / 52.18 - 1.4) + 0.0004 * index
    if (month === 11 && day >= 22 && day <= 28) value += 0.32
    if (month === 12 && day >= 19 && day <= 25) value += 0.42
    if (month === 12 && day >= 26) value -= 0.04
    if (month === 2 && day >= 8 && day <= 14) value += 0.06
    if (month === 9 && day >= 6 && day <= 12) value += 0.04
    if (month === 1 && day <= 20) value -= 0.06
    return value
  }
  const modelSpecs: [string, number, number][] = [
    ['SARIMA', 0.05, 0.01],
    ['Prophet', 0.038, -0.005],
    ['LightGBM', 0.028, 0.004],
    ['XGBoost', 0.031, 0],
  ]
  const stores: WalmartStore[] = [
    ['Store 1', 1], ['Store 4', 1.35], ['Store 10', 1.45], ['Store 20', 1.7], ['Store 33', 0.28],
  ].map(([name, factor], storeIndex) => {
    const rand = mulberry32(500 + storeIndex)
    const base = 1.55e6 * Number(factor)
    const smooth = dates.map((_, index) => base * clean(index))
    const actual = smooth.slice(0, historicalCount).map((value) => Math.round(value * (1 + 0.025 * gaussian(rand))))
    const modelSpecsWithNaive: [string, number, number][] = [['Seasonal Naive', 0.07, 0], ...modelSpecs]
    const models: WalmartModel[] = modelSpecsWithNaive.map(([modelName, errorLevel, bias], modelIndex) => {
      const forecast: (number | null)[] = Array(total).fill(null)
      const lo: (number | null)[] = Array(total).fill(null)
      const hi: (number | null)[] = Array(total).fill(null)
      if (modelName === 'Seasonal Naive') {
        for (let index = testStart; index < total; index++) {
          const lastYear = actual[index - 52]
          if (lastYear == null) continue
          const estimate = lastYear
          const width = 1.96 * Math.hypot(0.07, 0.025) * smooth[index]
          forecast[index] = Math.round(estimate)
          lo[index] = Math.round(estimate - width)
          hi[index] = Math.round(estimate + width)
        }
      } else {
        const modelRandom = mulberry32(900 + storeIndex * 10 + modelIndex)
        for (let index = testStart; index < total; index++) {
          const dynamicError = errorLevel * (1 + 0.02 * (index - testStart))
          const estimate = smooth[index] * (1 + bias + gaussian(modelRandom) * dynamicError)
          const width = 1.96 * Math.hypot(dynamicError, 0.025) * smooth[index]
          forecast[index] = Math.round(estimate)
          lo[index] = Math.round(estimate - width)
          hi[index] = Math.round(estimate + width)
        }
      }
      const testActual: number[] = []
      const testForecast: number[] = []
      const weights: number[] = []
      for (let index = testStart; index < historicalCount; index++) {
        const f = forecast[index]
        if (f == null) continue
        testActual.push(actual[index] as number)
        testForecast.push(f)
        weights.push(holidayData.some((holiday) => holiday.date === dates[index]) ? 5 : 1)
      }
      const metrics = calculateMetrics(testActual, testForecast)
      const wmae = testActual.length ? testActual.reduce((acc, value, index) => acc + weights[index] * Math.abs(value - testForecast[index]), 0) / sum(weights) : 0
      return { name: modelName, forecast, lo, hi, metrics: { ...metrics, wmae } }
    })
    return { name: String(name), factor: Number(factor), dates, actual, models }
  })
  return { testStart, historicalCount, holidays: holidayData, dates, stores }
})()

export const meanValue = mean
