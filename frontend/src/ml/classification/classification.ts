import { Rng } from '../lib/rng';
import { argmax, mean, std, sum } from '../lib/stats';
import { dist2, dot, makeScaler, memoRef, softmax } from '../lib/ml-utils';
import type { IrisDataset } from '../types';

export type Predictor = (x: number[]) => number[];
export interface ClassifierSpec {
  id: string;
  name: string;
  fit: (X: number[][], y: number[], C: number) => Predictor;
}

/* ───────── модели ───────── */
const knn = (k: number): ClassifierSpec => ({
  id: `knn${k}`,
  name: `KNN (k=${k})`,
  fit: (X, y, C) => {
    const tf = makeScaler(X);
    const Z = X.map(tf);
    return (x) => {
      const z = tf(x);
      const nb = Z.map((r, i) => ({ d: dist2(r, z), y: y[i] }))
        .sort((a, b) => a.d - b.d)
        .slice(0, k);
      const v = new Array<number>(C).fill(0.05);
      nb.forEach((n) => (v[n.y] += 1));
      const s = sum(v);
      return v.map((a) => a / s);
    };
  },
});

const gaussianNB: ClassifierSpec = {
  id: 'gnb',
  name: 'Gaussian Naive Bayes',
  fit: (X, y, C) => {
    const d = X[0].length;
    const st = Array.from({ length: C }, (_, c) => {
      const rows = X.filter((_, i) => y[i] === c);
      const mu = Array.from({ length: d }, (_, j) => mean(rows.map((r) => r[j])));
      const v = Array.from({ length: d }, (_, j) => Math.max(std(rows.map((r) => r[j])) ** 2, 1e-3));
      return { prior: rows.length / X.length, mu, v };
    });
    return (x) =>
      softmax(
        st.map(
          (s) =>
            Math.log(s.prior) +
            sum(x.map((val, j) => -0.5 * Math.log(2 * Math.PI * s.v[j]) - (val - s.mu[j]) ** 2 / (2 * s.v[j]))),
        ),
      );
  },
};

const logistic: ClassifierSpec = {
  id: 'logreg',
  name: 'Logistic Regression',
  fit: (X, y, C) => {
    const tf = makeScaler(X);
    const Z = X.map((r) => [1, ...tf(r)]);
    const d = Z[0].length;
    const W = Array.from({ length: C }, () => new Array<number>(d).fill(0));
    const lr = 0.2;
    const lambda = 0.01;
    for (let e = 0; e < 300; e++) {
      const g = Array.from({ length: C }, () => new Array<number>(d).fill(0));
      for (let i = 0; i < Z.length; i++) {
        const p = softmax(W.map((w) => dot(w, Z[i])));
        for (let c = 0; c < C; c++) {
          const err = p[c] - (y[i] === c ? 1 : 0);
          for (let j = 0; j < d; j++) g[c][j] += err * Z[i][j];
        }
      }
      for (let c = 0; c < C; c++)
        for (let j = 0; j < d; j++) W[c][j] -= lr * (g[c][j] / Z.length + (j > 0 ? lambda * W[c][j] : 0));
    }
    return (x) => {
      const z = [1, ...tf(x)];
      return softmax(W.map((w) => dot(w, z)));
    };
  },
};

const centroid: ClassifierSpec = {
  id: 'centroid',
  name: 'Nearest Centroid',
  fit: (X, y, C) => {
    const tf = makeScaler(X);
    const Z = X.map(tf);
    const d = Z[0].length;
    const cs = Array.from({ length: C }, (_, c) => {
      const rows = Z.filter((_, i) => y[i] === c);
      return Array.from({ length: d }, (_, j) => mean(rows.map((r) => r[j])));
    });
    return (x) => {
      const z = tf(x);
      return softmax(cs.map((c) => -dist2(c, z) / 2));
    };
  },
};

export const CLASSIFIERS = [logistic, knn(5), gaussianNB, centroid];

/* ───────── метрики ───────── */
export const accuracy = (yt: number[], yp: number[]) => mean(yt.map((v, i) => (v === yp[i] ? 1 : 0)));

export function confusionMatrix(yt: number[], yp: number[], C: number) {
  const cm = Array.from({ length: C }, () => new Array<number>(C).fill(0));
  yt.forEach((t, i) => cm[t][yp[i]]++);
  return cm;
}

export function rocCurve(yt: number[], probs: number[][], cls: number) {
  const pairs = yt.map((t, i) => ({ s: probs[i][cls], pos: t === cls })).sort((a, b) => b.s - a.s);
  const P = pairs.filter((p) => p.pos).length;
  const N = pairs.length - P;
  const points = [{ fpr: 0, tpr: 0 }];
  let tp = 0;
  let fp = 0;
  pairs.forEach((p, i) => {
    if (p.pos) tp++;
    else fp++;
    if (i === pairs.length - 1 || pairs[i + 1].s !== p.s) points.push({ fpr: fp / (N || 1), tpr: tp / (P || 1) });
  });
  let auc = 0;
  for (let i = 1; i < points.length; i++) auc += ((points[i].fpr - points[i - 1].fpr) * (points[i].tpr + points[i - 1].tpr)) / 2;
  return { points, auc };
}

function stratifiedSplit(y: number[], testFrac: number, rng: Rng) {
  const train: number[] = [];
  const test: number[] = [];
  [...new Set(y)].forEach((c) => {
    const idx = rng.shuffle(y.map((v, i) => (v === c ? i : -1)).filter((i) => i >= 0));
    const nTest = Math.round(idx.length * testFrac);
    test.push(...idx.slice(0, nTest));
    train.push(...idx.slice(nTest));
  });
  return { train, test };
}

function stratifiedFolds(y: number[], k: number, rng: Rng) {
  const folds = Array.from({ length: k }, () => [] as number[]);
  [...new Set(y)].forEach((c) => {
    rng
      .shuffle(y.map((v, i) => (v === c ? i : -1)).filter((i) => i >= 0))
      .forEach((i, j) => folds[j % k].push(i));
  });
  return folds;
}

function permutationImportance(pred: Predictor, X: number[][], y: number[], rng: Rng, repeats = 15) {
  const base = accuracy(y, X.map((x) => argmax(pred(x))));
  return X[0].map((_, j) => {
    const drops: number[] = [];
    for (let r = 0; r < repeats; r++) {
      const perm = rng.shuffle(X.map((x) => x[j]));
      const Xp = X.map((x, i) => {
        const c = [...x];
        c[j] = perm[i];
        return c;
      });
      drops.push(base - accuracy(y, Xp.map((x) => argmax(pred(x)))));
    }
    return { mean: mean(drops), std: std(drops) };
  });
}

/* ───────── полный анализ ───────── */
export interface ModelResult {
  id: string;
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  cm: number[][];
  yPred: number[]; // выровнено с testIdx
  roc: { cls: number; auc: number; points: { fpr: number; tpr: number }[] }[];
  aucMacro: number;
  cv: number[];
  cvMean: number;
  cvStd: number;
  importance: { feature: string; mean: number; std: number }[];
  predictor: Predictor; // обучен на всех данных (для live-предиктора)
}
export interface ClassificationAnalysis {
  trainIdx: number[];
  testIdx: number[];
  results: ModelResult[];
}

export const analyzeClassification = memoRef((ds: IrisDataset): ClassificationAnalysis => {
  const rng = new Rng(42);
  const C = ds.classNames.length;
  const { train, test } = stratifiedSplit(ds.y, 0.3, rng);
  const Xtr = train.map((i) => ds.X[i]);
  const ytr = train.map((i) => ds.y[i]);
  const Xte = test.map((i) => ds.X[i]);
  const yte = test.map((i) => ds.y[i]);
  const folds = stratifiedFolds(ds.y, 5, rng);

  const results = CLASSIFIERS.map((spec): ModelResult => {
    const pred = spec.fit(Xtr, ytr, C);
    const probs = Xte.map(pred);
    const yPred = probs.map(argmax);
    const cm = confusionMatrix(yte, yPred, C);

    const per = Array.from({ length: C }, (_, c) => {
      const tp = cm[c][c];
      const fp = sum(cm.map((r) => r[c])) - tp;
      const fn = sum(cm[c]) - tp;
      const p = tp / (tp + fp || 1);
      const r = tp / (tp + fn || 1);
      return { p, r, f: (2 * p * r) / (p + r || 1) };
    });

    const roc = Array.from({ length: C }, (_, c) => ({ cls: c, ...rocCurve(yte, probs, c) }));

    const cv = folds.map((fold) => {
      const set = new Set(fold);
      const tr = ds.y.map((_, i) => i).filter((i) => !set.has(i));
      const p = spec.fit(tr.map((i) => ds.X[i]), tr.map((i) => ds.y[i]), C);
      return accuracy(fold.map((i) => ds.y[i]), fold.map((i) => argmax(p(ds.X[i]))));
    });

    const imp = permutationImportance(pred, Xte, yte, rng);

    return {
      id: spec.id,
      name: spec.name,
      accuracy: accuracy(yte, yPred),
      precision: mean(per.map((x) => x.p)),
      recall: mean(per.map((x) => x.r)),
      f1: mean(per.map((x) => x.f)),
      cm,
      yPred,
      roc,
      aucMacro: mean(roc.map((r) => r.auc)),
      cv,
      cvMean: mean(cv),
      cvStd: std(cv),
      importance: imp.map((v, j) => ({ feature: ds.featureNames[j], ...v })),
      predictor: spec.fit(ds.X, ds.y, C),
    };
  });

  return { trainIdx: train, testIdx: test, results };
});