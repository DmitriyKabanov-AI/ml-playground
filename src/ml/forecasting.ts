import { ridge } from '../lib/linalg';
import { dot } from '../lib/ml-utils';
import { mean, std, sum } from '../lib/stats';
import type { WalmartRow, WalmartStore } from '../types';

const M = 52;
export interface FModel {
  id: string;
  name: string;
  run: (rows: WalmartRow[], n: number, h: number) => { forecast: number[]; sigma: number };
}

const seasonalNaive: FModel = {
  id: 'snaive',
  name: 'Seasonal Naive (−52 нед.)',
  run: (rows, n, h) => {
    const y = rows.map((r) => r.sales);
    const diffs: number[] = [];
    for (let t = M; t < n; t++) diffs.push(y[t] - y[t - M]);
    return { forecast: Array.from({ length: h }, (_, i) => y[n + i - M]), sigma: std(diffs) };
  },
};

const holtWinters: FModel = {
  id: 'hw',
  name: 'Holt-Winters (аддитивный)',
  run: (rows, n, h) => {
    const y = rows.slice(0, n).map((r) => r.sales);
    const [a, b, g, phi] = [0.25, 0.02, 0.3, 0.98];
    let level = mean(y.slice(0, M));
    let trend = (mean(y.slice(M, 2 * M)) - level) / M;
    const s = y.slice(0, M).map((v) => v - level);
    const errs: number[] = [];
    for (let t = M; t < n; t++) {
      const k = t % M;
      const e = y[t] - (level + trend + s[k]);
      errs.push(e);
      level += trend + a * e;
      trend += a * b * e;
      s[k] += g * (1 - a) * e;
    }
    const forecast = Array.from({ length: h }, (_, i) => {
      const j = i + 1;
      let damp = 0;
      for (let q = 1; q <= j; q++) damp += phi ** q;
      return level + trend * damp + s[(n - 1 + j) % M];
    });
    return { forecast, sigma: std(errs) };
  },
};

const HOLS = ['Super Bowl', 'Labor Day', 'Thanksgiving', 'Christmas'];
const feat = (t: number, hol: string | null) => {
  const f = [1, t / 52];
  for (let k = 1; k <= 10; k++) {
    const ang = (2 * Math.PI * k * t) / 52.1786;
    f.push(Math.sin(ang), Math.cos(ang));
  }
  HOLS.forEach((nm) => f.push(hol === nm ? 1 : 0));
  return f;
};
const fourier: FModel = {
  id: 'fourier',
  name: 'Fourier Regression + праздники',
  run: (rows, n, h) => {
    const y = rows.slice(0, n).map((r) => r.sales);
    const m = mean(y);
    const X = y.map((_, t) => feat(t, rows[t].holiday));
    const beta = ridge(X, y.map((v) => v / m), 0.3);
    const resid = y.map((v, t) => v - dot(beta, X[t]) * m);
    return {
      forecast: Array.from({ length: h }, (_, i) => dot(beta, feat(n + i, rows[n + i].holiday)) * m),
      sigma: std(resid) * 1.25,
    };
  },
};

const ensemble: FModel = {
  id: 'ensemble',
  name: 'Ансамбль (Fourier + HW)',
  run: (rows, n, h) => {
    const a = fourier.run(rows, n, h);
    const b = holtWinters.run(rows, n, h);
    return { forecast: a.forecast.map((v, i) => (v + b.forecast[i]) / 2), sigma: (a.sigma + b.sigma) / 2 };
  },
};

export const FORECAST_MODELS: FModel[] = [fourier, holtWinters, ensemble, seasonalNaive];

export interface ForecastResult {
  modelId: string;
  dates: string[];
  holidays: (string | null)[];
  actual: number[];
  forecast: number[];
  lo: number[];
  hi: number[];
  history: { date: string; actual: number; holiday: string | null }[];
  wmae: number;
  mape: number;
  bias: number;
  coverage: number;
  yoyForecast: number;
  yoyActual: number;
}

export function runForecast(store: WalmartStore, modelId: string, h: number): ForecastResult {
  const model = FORECAST_MODELS.find((m) => m.id === modelId) ?? FORECAST_MODELS[0];
  const rows = store.rows;
  const n = rows.length - h;
  const y = rows.map((r) => r.sales);
  const { forecast, sigma } = model.run(rows, n, h);
  const actual = y.slice(n);
  const lo = forecast.map((f, i) => f - 1.96 * sigma * Math.sqrt(1 + 0.03 * (i + 1)));
  const hi = forecast.map((f, i) => f + 1.96 * sigma * Math.sqrt(1 + 0.03 * (i + 1)));
  const w = rows.slice(n).map((r) => (r.holiday ? 5 : 1));
  const lastYear = y.slice(n - M, n - M + h);
  return {
    modelId: model.id,
    dates: rows.slice(n).map((r) => r.date),
    holidays: rows.slice(n).map((r) => r.holiday),
    actual,
    forecast,
    lo,
    hi,
    history: rows.slice(Math.max(0, n - 52), n).map((r) => ({ date: r.date, actual: r.sales, holiday: r.holiday })),
    wmae: sum(actual.map((a, i) => w[i] * Math.abs(a - forecast[i]))) / sum(w),
    mape: mean(actual.map((a, i) => Math.abs(a - forecast[i]) / a)) * 100,
    bias: (mean(forecast) / mean(actual) - 1) * 100,
    coverage: mean(actual.map((a, i) => (a >= lo[i] && a <= hi[i] ? 1 : 0))) * 100,
    yoyForecast: sum(forecast) / sum(lastYear) - 1,
    yoyActual: sum(actual) / sum(lastYear) - 1,
  };
}

/** Средние метрики моделей по всем магазинам. */
export function walmartLeaderboard(stores: WalmartStore[], h: number) {
  return FORECAST_MODELS.map((m) => {
    const rs = stores.map((s) => runForecast(s, m.id, h));
    return { id: m.id, name: m.name, wmae: mean(rs.map((r) => r.wmae)), mape: mean(rs.map((r) => r.mape)) };
  }).sort((a, b) => a.wmae - b.wmae);
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
export function seasonality(store: WalmartStore) {
  const y = store.rows.map((r) => r.sales);
  const b = ridge(y.map((_, t) => [1, t]), y, 0);
  const ratio = y.map((v, t) => v / (b[0] + b[1] * t));
  const monthly = MONTHS.map((month, mi) => ({
    month,
    index: mean(ratio.filter((_, t) => new Date(`${store.rows[t].date}T00:00:00Z`).getUTCMonth() === mi)) * 100,
  }));
  const holidays = HOLS.map((name) => {
    const ups: number[] = [];
    store.rows.forEach((r, i) => {
      if (r.holiday !== name) return;
      const nb = [-3, -2, -1, 1, 2, 3]
        .map((d) => i + d)
        .filter((j) => j >= 0 && j < y.length && !store.rows[j].holiday)
        .map((j) => y[j]);
      if (nb.length) ups.push(y[i] / mean(nb) - 1);
    });
    return { name, uplift: mean(ups) * 100 };
  });
  return { monthly, holidays };
}