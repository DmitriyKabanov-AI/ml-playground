import { describe, expect, it } from 'vitest';
import { ridge } from '@/lib/linalg';
import { generateIris, generateRegression, generateWalmart, generateWeather } from '@/data/generators';
import { analyzeClassification } from '@/ml/classification';
import { analyzeRegression } from '@/ml/regression';
import { runForecast } from '@/ml/forecasting';
import { analyzeWeather } from '@/ml/forecasting';

describe('linalg', () => {
  it('ridge восстанавливает y = 2x + 1', () => {
    const X = [0, 1, 2, 3, 4].map((x) => [1, x]);
    const b = ridge(X, [1, 3, 5, 7, 9], 0);
    expect(b[0]).toBeCloseTo(1, 6);
    expect(b[1]).toBeCloseTo(2, 6);
  });
});

describe('ML-пайплайны', () => {
  it('классификация Iris достигает разумной точности', () => {
    const an = analyzeClassification(generateIris());
    an.results.forEach((r) => expect(r.accuracy).toBeGreaterThan(0.8));
  });
  it('регрессия: нелинейная модель не хуже линейной', () => {
    const an = analyzeRegression(generateRegression());
    const lin = an.results.find((r) => r.id === 'linear')!;
    const best = Math.max(...an.results.map((r) => r.r2));
    expect(best).toBeGreaterThanOrEqual(lin.r2);
  });
  it('Walmart: прогноз имеет нужную длину и валидные метрики', () => {
    const ds = generateWalmart();
    const r = runForecast(ds.stores[0], 'fourier', 13);
    expect(r.forecast).toHaveLength(13);
    expect(Number.isFinite(r.wmae)).toBe(true);
  });
  it('Погода: 7 горизонтов, skill persistence = 0', () => {
    const an = analyzeWeather(generateWeather());
    const s = Object.values(Object.values(an)[0])[0];
    expect(s.models[0].skill.every((v) => v === 0)).toBe(true);
    expect(s.models[0].forecast).toHaveLength(7);
  });
});