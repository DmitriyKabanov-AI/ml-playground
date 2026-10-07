"use client";
import { useJson } from "./loader";

export const IRIS_CLASSES = ["setosa", "versicolor", "virginica"] as const;
export type IrisClass = typeof IRIS_CLASSES[number];

export interface IrisPoint {
  id: number;
  sepalLength: number;
  sepalWidth: number;
  petalLength: number;
  petalWidth: number;
  actual: IrisClass;
  predicted: IrisClass;
  correct: boolean;
}

export interface IrisRaw {       // что отдаёт results.json
  classes: string[];
  features: string[];
  points: IrisPoint[];
  importance: { feature: string; importance: number }[];
  cv: number[];
  roc: { cls: string; auc: number; fpr: number[]; tpr: number[] }[];
}

export function useIrisData() {
  const { data, loading } = useJson<any>("classification/iris/results.json");
  if (!data?.classification) return { iris: null as IrisRaw | null, loading };

  const c = data.classification;
  const classes: string[] = c.classes ?? [];
  const points: IrisPoint[] = (c.points ?? []).map((pt: any, i: number) => ({
    id: i,
    sepalLength: pt.f[0],
    sepalWidth: pt.f[1],
    petalLength: pt.f[2],
    petalWidth: pt.f[3],
    actual: (classes[pt.y] ?? String(pt.y)) as IrisClass,
    predicted: (classes[pt.p] ?? String(pt.p)) as IrisClass,
    correct: pt.y === pt.p,
  }));

  const importance = (c.importance ?? []).map((x: any) => ({
    feature: x.name,
    importance: x.value,
  }));

  return {
    iris: { classes, features: c.features ?? [], points, importance, cv: c.cv ?? [], roc: c.roc ?? [] },
    loading,
  };
}

/** k-NN по реальным 150 точкам — живой инференс без бэкенда */
export function predictIris(
  sl: number, sw: number, pl: number, pw: number,
  points: IrisPoint[], k = 7
) {
  if (!points.length) return { probs: {} as Record<IrisClass, number>, predicted: "setosa" as IrisClass };
  const dists = points
    .map((p) => ({ p, d: Math.hypot(p.sepalLength - sl, p.sepalWidth - sw, p.petalLength - pl, p.petalWidth - pw) }))
    .sort((a, b) => a.d - b.d);
  const votes: Record<string, number> = { setosa: 0, versicolor: 0, virginica: 0 };
  for (let i = 0; i < Math.min(k, dists.length); i++) {
    votes[dists[i].p.actual] += 1 / (dists[i].d + 1e-3);
  }
  const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
  const probs = {
    setosa: votes.setosa / total,
    versicolor: votes.versicolor / total,
    virginica: votes.virginica / total,
  } as Record<IrisClass, number>;
  const predicted = (Object.keys(probs) as IrisClass[]).sort((a, b) => probs[b] - probs[a])[0];
  return { probs, predicted };
}
