// Типы и хелперы погодного модуля. Реальные данные — artifacts/weather/cities/stations.json,
// грузятся через WeatherDataProvider (lib/data/weatherArtifacts.ts).

export type WeatherStation = {
  id: number | string;
  label: string;
  lat?: number;
  lon?: number;
  meanT?: number;
  seasonalAmp?: number;
  noise?: number;
};

export type WeatherDay = { date: string; actual: number; holiday?: string; anomaly?: boolean };

export type WeatherModelSpec = {
  name: string;
  isBaseline: boolean;
  model?: string;
  description?: string;
};

export type WeatherMetrics = {
  mae: number; rmse: number; r2: number; mape: number;
  bias: number; maxError: number; medae: number; skill: number;
};

export type WeatherPrediction = {
  date: string; actual: number; predicted: number;
  error: number; abs_error: number; within_mae: boolean; is_outlier: boolean;
};

export type WeatherEvaluation = {
  horizon: number; model: string;
  points: WeatherPrediction[];
  metrics: WeatherMetrics;
  deltaVsPersistence: number;
};

export type WeatherStationDataset = {
  station: WeatherStation;
  series: WeatherDay[];
  testStart: number;
  evaluations: Record<string, Record<number, WeatherEvaluation>>;
};

export const HORIZONS = Array.from({ length: 14 }, (_, i) => i + 1);

export function sum(values: number[]) {
  return values.reduce((t, v) => t + v, 0);
}
export function mean(values: number[]) {
  return values.length ? sum(values) / values.length : 0;
}
export function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gaussian(random: () => number) {
  let u = 0, v = 0;
  while (!u) u = random();
  while (!v) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function calculateMetrics(yTrue: number[], yPred: number[], persistenceMae = 0) {
  const n = Math.min(yTrue.length, yPred.length);
  if (!n) return { mae: 0, rmse: 0, r2: 0, mape: 0, bias: 0, maxError: 0, medae: 0, skill: 0 };
  const a = yTrue.slice(0, n);
  const p = yPred.slice(0, n);
  const err = p.map((v, i) => v - a[i]);
  const abs = err.map(Math.abs);
  const m = mean(a);
  const ssr = sum(err.map((v) => v * v));
  const sst = sum(a.map((v) => (v - m) ** 2));
  const rel = a.map((v, i) => (Math.abs(v) >= 1 ? abs[i] / Math.abs(v) : null))
    .filter((v): v is number => v != null);
  const mae = mean(abs);
  return {
    mae,
    rmse: Math.sqrt(ssr / n),
    r2: sst ? 1 - ssr / sst : 0,
    mape: rel.length ? mean(rel) * 100 : 0,
    bias: mean(err),
    maxError: Math.max(...abs),
    medae: median(abs),
    skill: persistenceMae > 0 ? 1 - mae / persistenceMae : 0,
  };
}

/** Средний skill модели по всем горизонтам для одной станции */
export function meanSkillForModel(stationData: WeatherStationDataset, modelName: string) {
  const byH = stationData.evaluations?.[modelName];
  if (!byH) return 0;
  const hs = Object.keys(byH).map(Number).sort((a, b) => a - b);
  if (!hs.length) return 0;
  return mean(hs.map((h) => byH[h]?.metrics?.skill ?? 0));
}
