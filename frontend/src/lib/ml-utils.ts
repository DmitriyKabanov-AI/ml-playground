import { mean, std, sum } from '@/lib/stats';

export const dot = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};
export const dist2 = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
};

export function makeScaler(X: number[][]) {
  const d = X[0].length;
  const mu = Array.from({ length: d }, (_, j) => mean(X.map((r) => r[j])));
  const sd = Array.from({ length: d }, (_, j) => std(X.map((r) => r[j])) || 1);
  return (x: number[]) => x.map((v, j) => (v - mu[j]) / sd[j]);
}

export function softmax(z: number[]) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = sum(e);
  return e.map((v) => v / s);
}

/** Мемоизация по ссылке на объект: тяжёлый расчёт выполняется один раз на набор данных. */
export function memoRef<A extends object, R>(fn: (a: A) => R) {
  const cache = new WeakMap<A, R>();
  return (a: A): R => {
    if (!cache.has(a)) cache.set(a, fn(a));
    return cache.get(a)!;
  };
}