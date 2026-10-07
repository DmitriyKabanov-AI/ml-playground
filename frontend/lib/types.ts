export type TaskId = "iris" | "bc-fp" | "bc-fn" | "fraud" | "digits";
export type TaskKind = "classification" | "regression" | "forecasting";

export interface ModelInfo {
  id: string;
  name: string;
  type: string;
  isDefault?: boolean;
}

export interface MetricsSet {
  accuracy?: number;
  balancedAccuracy?: number;
  precisionMacro?: number;
  recallMacro?: number;
  f1Macro?: number;
  f1Weighted?: number;
  f05Macro?: number;
  f2Macro?: number;
  mcc?: number;
  kappa?: number;
  rocAuc?: number;
  prAuc?: number;
  specificity?: number;
  sensitivity?: number;
  top2Accuracy?: number;
  top3Accuracy?: number;
  [k: string]: number | undefined;
}

export interface ThresholdPoint {
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  f05: number;
  f2: number;
  mcc: number;
  fp: number;
  fn: number;
  tp: number;
  tn: number;
}

export interface FeatureImportanceItem { feature: string; importance: number; }
