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

export interface IrisRaw {
  classes: string[];
  features: string[];
  points: IrisPoint[];
  importance: { feature: string; importance: number }[];
  cv: number[];
  roc: { cls: string; auc: number; fpr: number[]; tpr: number[] }[];
}

export function useIrisData() {
  // FIX: забираем error из useJson, а не глотаем его.
  const { data, loading, error } = useJson<any>("classification/iris/results.json");

  if (error) {
    return { iris: null as IrisRaw | null, loading: false, error };
  }
  if (!data?.classification) {
    // data ещё нет, но loading уже false → это ошибка контента, не «вечная загрузка»
    return {
      iris: null as IrisRaw | null,
      loading,
      error: loading ? null : "results.json не содержит поля classification",
    };
  }

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
    error: null as string | null,
  };
}

/** Smooth KDE-инференс: плавные вероятности без скачков k-NN. */
export function predictIris(
  sl: number, sw: number, pl: number, pw: number,
  points: IrisPoint[],
  bandwidth = 0.55,
) {
  if (!points.length) {
    return { probs: {} as Record<IrisClass, number>, predicted: "setosa" as IrisClass };
  }

  const W = { sepalLength: 1, sepalWidth: 1, petalLength: 1.5, petalWidth: 2 };

  const votes: Record<IrisClass, number> = { setosa: 1e-6, versicolor: 1e-6, virginica: 1e-6 };
  const h2 = 2 * bandwidth * bandwidth;

  for (const p of points) {
    const d2 =
      W.sepalLength * (p.sepalLength - sl) ** 2 +
      W.sepalWidth  * (p.sepalWidth  - sw) ** 2 +
      W.petalLength * (p.petalLength - pl) ** 2 +
      W.petalWidth  * (p.petalWidth  - pw) ** 2;
    votes[p.actual] += Math.exp(-d2 / h2);
  }

  const total = votes.setosa + votes.versicolor + votes.virginica || 1;
  const probs = {
    setosa:     votes.setosa     / total,
    versicolor: votes.versicolor / total,
    virginica:  votes.virginica  / total,
  } as Record<IrisClass, number>;

  const predicted = (Object.keys(probs) as IrisClass[])
    .sort((a, b) => probs[b] - probs[a])[0];

  return { probs, predicted };
}