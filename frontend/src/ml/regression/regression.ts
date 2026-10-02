import { Rng } from '@/lib/rng';
import { histogram, mae, mape, mean, r2, rmse } from '@/lib/stats';
import { ridge } from '@/lib/linalg';
import { dist2, dot, makeScaler, memoRef } from '@/lib/ml-utils';
import type { RegressionDataset } from '@/types';

type Fitted = (x: number[]) => number;
interface RegSpec {
  id: string;
  name: string;
  fit: (X: number[][], y: number[]) => Fitted;
}

const linear = (lambda: number, id: string, name: string): RegSpec => ({
  id,
  name,
  fit: (X, y) => {
    const tf = makeScaler(X);
    const b = ridge(X.map((r) => [1, ...tf(r)]), y, lambda);
    return (x) => dot(b, [1, ...tf(x)]);
  },
});

const expand = (z: number[]) => {
  const f = [1, ...z];
  for (let i = 0; i < z.length; i++) for (let j = i; j < z.length; j++) f.push(z[i] * z[j]);
  return f;
};
const poly: RegSpec = {
  id: 'poly2',
  name: 'Polynomial (deg 2) + Ridge',
  fit: (X, y) => {
    const tf = makeScaler(X);
    const b = ridge(X.map((r) => expand(tf(r))), y, 2);
    return (x) => dot(b, expand(tf(x)));
  },
};

const knnReg = (k: number): RegSpec => ({
  id: 'knn',
  name: `KNN Regressor (k=${k})`,
  fit: (X, y) => {
    const tf = makeScaler(X);
    const Z = X.map(tf);
    return (x) => {
      const z = tf(x);
      const nb = Z.map((r, i) => ({ d: dist2(r, z), i }))
        .sort((a, b) => a.d - b.d)
        .slice(0, k);
      let sw = 0;
      let s = 0;
      nb.forEach((n) => {
        const w = 1 / (Math.sqrt(n.d) + 1e-3);
        sw += w;
        s += w * y[n.i];
      });
      return s / sw;
    };
  },
});

/** Градиентный бустинг на решающих пнях (аддитивная модель). */
const boosting: RegSpec = {
  id: 'gbm',
  name: 'Gradient Boosting (stumps)',
  fit: (X, y) => {
    const n = X.length;
    const d = X[0].length;
    const rounds = 160;
    const lr = 0.1;
    const base = mean(y);
    const pred = new Array<number>(n).fill(base);
    const thr = Array.from({ length: d }, (_, j) => {
      const s = X.map((r) => r[j]).sort((a, b) => a - b);
      return Array.from({ length: 15 }, (_, q) => s[Math.floor(((q + 1) / 16) * (n - 1))]);
    });
    const stumps: { f: number; t: number; l: number; r: number }[] = [];
    for (let m = 0; m < rounds; m++) {
      const res = y.map((v, i) => v - pred[i]);
      let best = { gain: -Infinity, f: 0, t: 0, l: 0, r: 0 };
      for (let f = 0; f < d; f++) {
        for (const t of thr[f]) {
          let sl = 0, cl = 0, sr = 0, cr = 0;
          for (let i = 0; i < n; i++) {
            if (X[i][f] <= t) { sl += res[i]; cl++; } else { sr += res[i]; cr++; }
          }
          if (!cl || !cr) continue;
          const gain = (sl * sl) / cl + (sr * sr) / cr;
          if (gain > best.gain) best = { gain, f, t, l: sl / cl, r: sr / cr };
        }
      }
      stumps.push(best);
      for (let i = 0; i < n; i++) pred[i] += lr * (X[i][best.f] <= best.t ? best.l : best.r);
    }
    return (x) => stumps.reduce((s, st) => s + lr * (x[st.f] <= st.t ? st.l : st.r), base);
  },
};

const SPECS: RegSpec[] = [
  linear(0, 'linear', 'Linear Regression'),
  linear(8, 'ridge', 'Ridge (λ=8)'),
  poly,
  knnReg(7),
  boosting,
];

function permImportance(pred: Fitted, X: number[][], y: number[], rng: Rng, repeats = 5) {
  const base = r2(y, X.map(pred));
  return X[0].map((_, j) => {
    const drops: number[] = [];
    for (let r = 0; r < repeats; r++) {
      const perm = rng.shuffle(X.map((x) => x[j]));
      const Xp = X.map((x, i) => {
        const c = [...x];
        c[j] = perm[i];
        return c;
      });
      drops.push(base - r2(y, Xp.map(pred)));
    }
    return mean(drops);
  });
}

export interface RegResult {
  id: string;
  name: string;
  yPred: number[];
  residuals: number[];
  rmse: number;
  mae: number;
  r2: number;
  mape: number;
  importance: { feature: string; value: number }[];
  hist: { mid: number; count: number }[];
}
export interface RegAnalysis {
  yTest: number[];
  results: RegResult[];
}

export const analyzeRegression = memoRef((ds: RegressionDataset): RegAnalysis => {
  const rng = new Rng(7);
  const idx = rng.shuffle(ds.y.map((_, i) => i));
  const nTest = Math.round(idx.length * 0.2);
  const te = idx.slice(0, nTest);
  const tr = idx.slice(nTest);
  const Xtr = tr.map((i) => ds.X[i]);
  const ytr = tr.map((i) => ds.y[i]);
  const Xte = te.map((i) => ds.X[i]);
  const yte = te.map((i) => ds.y[i]);

  const results = SPECS.map((s): RegResult => {
    const f = s.fit(Xtr, ytr);
    const yPred = Xte.map(f);
    const residuals = yte.map((v, i) => v - yPred[i]);
    return {
      id: s.id,
      name: s.name,
      yPred,
      residuals,
      rmse: rmse(yte, yPred),
      mae: mae(yte, yPred),
      r2: r2(yte, yPred),
      mape: mape(yte, yPred),
      importance: permImportance(f, Xte, yte, rng).map((value, j) => ({ feature: ds.featureNames[j], value })),
      hist: histogram(residuals, 16),
    };
  });
  return { yTest: yte, results };
});