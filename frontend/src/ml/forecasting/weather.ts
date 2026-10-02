import { ridge } from '@/lib/linalg';
import { dot, memoRef } from '@/lib/ml-utils';
import { clamp, mean, sum } from '@/lib/stats';
import type { WeatherDataset } from '@/types';

export const HORIZON = 7;
const W = (2 * Math.PI) / 365.25;
const harm = (t: number) => [1, Math.sin(W * t), Math.cos(W * t), Math.sin(2 * W * t), Math.cos(2 * W * t)];

type WPredictor = (origin: number, h: number) => number;
interface WModel {
  id: string;
  name: string;
  fit: (x: number[], trainEnd: number) => WPredictor;
}

function fitClim(x: number[], end: number) {
  const b = ridge(Array.from({ length: end }, (_, t) => harm(t)), x.slice(0, end), 1e-3);
  return (t: number) => dot(b, harm(t));
}

const persistence: WModel = { id: 'persistence', name: 'Persistence (вчера = завтра)', fit: (x) => (o) => x[o] };

const climatology: WModel = {
  id: 'climatology',
  name: 'Climatology (гармоники)',
  fit: (x, end) => {
    const c = fitClim(x, end);
    return (o, h) => c(o + h);
  },
};

const arAnomaly: WModel = {
  id: 'ar1',
  name: 'Climatology + AR(1) аномалий',
  fit: (x, end) => {
    const c = fitClim(x, end);
    const a = x.slice(0, end).map((v, t) => v - c(t));
    let num = 0;
    let den = 0;
    for (let t = 1; t < a.length; t++) {
      num += a[t] * a[t - 1];
      den += a[t - 1] ** 2;
    }
    const phi = num / (den || 1);
    return (o, h) => c(o + h) + phi ** h * (x[o] - c(o));
  },
};

const directRidge: WModel = {
  id: 'ridge',
  name: 'Direct Ridge (мульти-горизонт)',
  fit: (x, end) => {
    const c = fitClim(x, end);
    const a = x.map((v, t) => v - c(t));
    const lags = (o: number) => [1, a[o], a[o - 1], a[o - 2], a[o - 3]];
    const coefs = Array.from({ length: HORIZON }, (_, k) => {
      const h = k + 1;
      const X: number[][] = [];
      const y: number[] = [];
      for (let t = 3; t + h < end; t++) {
        X.push(lags(t));
        y.push(a[t + h]);
      }
      return ridge(X, y, 1);
    });
    return (o, h) => c(o + h) + dot(coefs[h - 1], lags(o));
  },
};

export const WEATHER_MODELS = [persistence, climatology, arAnomaly, directRidge];

const post = (key: string, v: number) =>
  key === 'humidity' ? clamp(v, 0, 100) : key === 'wind' || key === 'precip' ? Math.max(0, v) : v;

export interface ModelEval {
  id: string;
  name: string;
  rmse: number[]; // по горизонтам 1..7
  mae: number[];
  skill: number[]; // 1 − RMSE/RMSE_persistence
  lead1: number[]; // бэктест на 14 дней при горизонте 1
  forecast: number[]; // прогноз на 7 дней вперёд
}
export interface SeriesEval {
  actual: number[]; // последние 14 дней
  models: ModelEval[];
}
export type WeatherAnalysis = Record<string, Record<string, SeriesEval>>;

function evalSeries(key: string, x: number[]): SeriesEval {
  const N = x.length;
  const T = N - 21; // обучение — до начала бэктеста, без утечки
  const targets = Array.from({ length: 14 }, (_, i) => N - 14 + i);
  const raw = WEATHER_MODELS.map((m) => {
    const bt = m.fit(x, T);
    const full = m.fit(x, N);
    const errs = Array.from({ length: HORIZON }, (_, k) =>
      targets.map((tg) => x[tg] - post(key, bt(tg - (k + 1), k + 1))),
    );
    return {
      id: m.id,
      name: m.name,
      rmse: errs.map((e) => Math.sqrt(mean(e.map((v) => v * v)))),
      mae: errs.map((e) => mean(e.map(Math.abs))),
      lead1: targets.map((tg) => post(key, bt(tg - 1, 1))),
      forecast: Array.from({ length: HORIZON }, (_, k) => post(key, full(N - 1, k + 1))),
    };
  });
  const base = raw[0].rmse;
  return {
    actual: targets.map((t) => x[t]),
    models: raw.map((r) => ({ ...r, skill: r.rmse.map((v, i) => 1 - v / (base[i] || 1)) })),
  };
}

export const analyzeWeather = memoRef((ds: WeatherDataset): WeatherAnalysis => {
  const out: WeatherAnalysis = {};
  ds.cities.forEach((c) => {
    out[c.name] = {};
    ds.variables.forEach((v) => {
      out[c.name][v.key] = evalSeries(v.key, c.series[v.key]);
    });
  });
  return out;
});

/** Средний skill модели по всем городам/переменным на каждом горизонте. */
export function skillByHorizon(an: WeatherAnalysis, modelId: string) {
  const all = Object.values(an).flatMap((c) => Object.values(c));
  return Array.from({ length: HORIZON }, (_, h) =>
    mean(all.map((s) => s.models.find((m) => m.id === modelId)!.skill[h])),
  );
}
export function weatherLeaderboard(an: WeatherAnalysis) {
  return WEATHER_MODELS.map((m) => {
    const sk = skillByHorizon(an, m.id);
    return { id: m.id, name: m.name, skill: sum(sk) / sk.length };
  }).sort((a, b) => b.skill - a.skill);
}