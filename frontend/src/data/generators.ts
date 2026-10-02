import { Rng } from '../lib/rng';
import { clamp } from '../lib/stats';
import type { IrisDataset, RegressionDataset, WalmartDataset, WeatherDataset } from '../types';

/* ───────── Iris-подобный набор (статистики реального Iris) ───────── */
export function generateIris(): IrisDataset {
  const rng = new Rng(11);
  const spec = [
    { mu: [5.006, 3.428, 1.462, 0.246], sd: [0.352, 0.379, 0.174, 0.105] },
    { mu: [5.936, 2.77, 4.26, 1.326], sd: [0.516, 0.314, 0.47, 0.198] },
    { mu: [6.588, 2.974, 5.552, 2.026], sd: [0.636, 0.322, 0.552, 0.275] },
  ];
  const X: number[][] = [];
  const y: number[] = [];
  spec.forEach((s, c) => {
    for (let i = 0; i < 50; i++) {
      X.push(s.mu.map((m, j) => +Math.max(0.1, rng.normal(m, s.sd[j])).toFixed(1)));
      y.push(c);
    }
  });
  return {
    featureNames: ['Sepal length', 'Sepal width', 'Petal length', 'Petal width'],
    classNames: ['setosa', 'versicolor', 'virginica'],
    X,
    y,
  };
}

/* ───────── Регрессия: цена жилья ───────── */
export function generateRegression(): RegressionDataset {
  const rng = new Rng(23);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 800; i++) {
    const inc = clamp(Math.exp(rng.normal(1.2, 0.5)), 0.5, 12);
    const age = rng.uniform(1, 52);
    const rooms = clamp(rng.normal(5.4, 1.1), 2.5, 9);
    const occ = clamp(rng.normal(3, 0.7), 1.2, 6);
    const dist = clamp(-Math.log(1 - rng.next()) * 12, 0, 50);
    const price =
      0.4 + 0.45 * inc + 0.03 * inc * inc + 0.06 * rooms - 0.2 * occ - 0.015 * dist + 0.003 * age +
      0.04 * inc * (rooms - 5.4) + rng.normal(0, 0.3);
    X.push([inc, age, rooms, occ, dist]);
    y.push(clamp(price, 0.15, 5));
  }
  return { featureNames: ['MedInc', 'HouseAge', 'AvgRooms', 'AvgOccup', 'DistCenter'], target: 'Price ($100k)', X, y };
}

/* ───────── Walmart: 143 недели, 6 магазинов ───────── */
const HOLIDAYS: Record<string, string> = {
  '2010-02-12': 'Super Bowl', '2011-02-11': 'Super Bowl', '2012-02-10': 'Super Bowl',
  '2010-09-10': 'Labor Day', '2011-09-09': 'Labor Day', '2012-09-07': 'Labor Day',
  '2010-11-26': 'Thanksgiving', '2011-11-25': 'Thanksgiving',
  '2010-12-31': 'Christmas', '2011-12-30': 'Christmas',
};
const HOL_EFFECT: Record<string, number> = { 'Super Bowl': 0.06, 'Labor Day': 0.03, Thanksgiving: 0.32, Christmas: -0.08 };
const doy = (d: Date) => Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);

export function generateWalmart(): WalmartDataset {
  const rng = new Rng(31);
  const start = Date.UTC(2010, 1, 5);
  const stores = Array.from({ length: 6 }, (_, s) => {
    const base = rng.uniform(0.7e6, 2.1e6);
    const growth = rng.normal(0.03, 0.015);
    const rows = Array.from({ length: 143 }, (_, i) => {
      const d = new Date(start + i * 7 * 864e5);
      const date = d.toISOString().slice(0, 10);
      const day = doy(d);
      const holiday = HOLIDAYS[date] ?? null;
      const seasonal =
        0.08 * Math.sin((2 * Math.PI * (day - 110)) / 365) +
        0.3 * Math.exp(-(((day - 345) / 12) ** 2)) +
        0.06 * Math.exp(-(((day - 95) / 10) ** 2));
      const eff = holiday ? HOL_EFFECT[holiday] : 0;
      const sales = base * (1 + growth * (i / 52)) * (1 + seasonal + eff + rng.normal(0, 0.025));
      return { date, sales: Math.round(sales), holiday };
    });
    return { id: s + 1, name: `Store ${s + 1}`, rows };
  });
  return { stores };
}

/* ───────── Погода: 4 города × 5 переменных × 3 года ───────── */
export function generateWeather(): WeatherDataset {
  const rng = new Rng(47);
  const N = 1095;
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const startMs = end.getTime() - N * 864e5;
  const startDate = new Date(startMs).toISOString().slice(0, 10);
  const params = [
    { name: 'Москва', t: 5.5, a: 14, h: 76, p: 1015, w: 3.4 },
    { name: 'Санкт-Петербург', t: 5, a: 12, h: 80, p: 1013, w: 4.2 },
    { name: 'Сочи', t: 14.5, a: 9, h: 72, p: 1016, w: 2.6 },
    { name: 'Новосибирск', t: 2.5, a: 19, h: 73, p: 1017, w: 3.1 },
  ];
  const cities = params.map((c) => {
    let aT = 0, aH = 0, aP = 0, aW = 0;
    const s = { temp: [] as number[], humidity: [] as number[], pressure: [] as number[], wind: [] as number[], precip: [] as number[] };
    for (let i = 0; i < N; i++) {
      const ang = (2 * Math.PI * (doy(new Date(startMs + i * 864e5)) - 15)) / 365.25;
      aT = 0.78 * aT + rng.normal(0, 2.4);
      aH = 0.6 * aH + rng.normal(0, 7);
      aP = 0.85 * aP + rng.normal(0, 3.2);
      aW = 0.55 * aW + rng.normal(0, 1.4);
      const temp = c.t - c.a * Math.cos(ang) + aT;
      const hum = clamp(c.h + 6 * Math.cos(ang) - 0.8 * aT + aH, 25, 100);
      const wet = clamp((hum - 62) / 55 + 0.1, 0.03, 0.75);
      s.temp.push(+temp.toFixed(1));
      s.humidity.push(+hum.toFixed(0));
      s.pressure.push(+(c.p + aP).toFixed(1));
      s.wind.push(+Math.max(0, c.w + 1.2 * Math.cos(ang) + aW).toFixed(1));
      s.precip.push(rng.next() < wet ? +(-Math.log(Math.max(rng.next(), 1e-6)) * 4).toFixed(1) : 0);
    }
    return { name: c.name, startDate, series: s };
  });
  return {
    variables: [
      { key: 'temp', label: 'Температура', unit: '°C', decimals: 1 },
      { key: 'humidity', label: 'Влажность', unit: '%', decimals: 0 },
      { key: 'pressure', label: 'Давление', unit: 'гПа', decimals: 1 },
      { key: 'wind', label: 'Ветер', unit: 'м/с', decimals: 1 },
      { key: 'precip', label: 'Осадки', unit: 'мм', decimals: 1 },
    ],
    cities,
  };
}