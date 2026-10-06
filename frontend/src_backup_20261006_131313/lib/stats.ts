export const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
export const std = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map((v) => (v - m) ** 2)) / (a.length - 1));
};
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const argmax = (a: number[]) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);

export const rmse = (y: number[], p: number[]) => Math.sqrt(mean(y.map((v, i) => (v - p[i]) ** 2)));
export const mae = (y: number[], p: number[]) => mean(y.map((v, i) => Math.abs(v - p[i])));
export const mape = (y: number[], p: number[]) =>
  mean(y.map((v, i) => Math.abs((v - p[i]) / (v || 1e-9)))) * 100;
export function r2(y: number[], p: number[]) {
  const m = mean(y);
  const ssT = sum(y.map((v) => (v - m) ** 2));
  const ssR = sum(y.map((v, i) => (v - p[i]) ** 2));
  return ssT === 0 ? 0 : 1 - ssR / ssT;
}

export function histogram(values: number[], bins = 16) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const w = (hi - lo) / bins || 1;
  const counts = new Array<number>(bins).fill(0);
  values.forEach((v) => {
    counts[Math.min(bins - 1, Math.floor((v - lo) / w))]++;
  });
  return counts.map((count, i) => ({ mid: lo + (i + 0.5) * w, count }));
}