import { Sparkles, TrendingUp, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Category } from '../types'

export const CATEGORY_LABELS: Record<Category, string> = {
  classification: 'Классификация',
  regression: 'Регрессия',
  forecasting: 'Прогнозирование',
}

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  classification: Sparkles,
  regression: TrendingUp,
  forecasting: BarChart3,
}

export const PRIMARY_METRIC: Record<Category, string> = {
  classification: 'f1_macro',
  regression: 'rmse',
  forecasting: 'skill_avg',
}

export const METRIC_DIRECTION: Record<string, 'up' | 'down'> = {
  f1_macro: 'up',
  accuracy: 'up',
  precision_macro: 'up',
  recall_macro: 'up',
  f2_macro: 'up',
  'f0.5_macro': 'up',
  f1_weighted: 'up',
  balanced_accuracy: 'up',
  mcc: 'up',
  kappa: 'up',
  rmse: 'down',
  mae: 'down',
  mape: 'down',
  r2: 'up',
  medae: 'down',
  max_error: 'down',
  skill_avg: 'up',
  mae_avg: 'down',
}

export const METRIC_LABELS: Record<string, string> = {
  f1_macro: 'F1 (macro)',
  accuracy: 'Accuracy',
  precision_macro: 'Precision (macro)',
  recall_macro: 'Recall (macro)',
  f2_macro: 'F2 (macro)',
  'f0.5_macro': 'F0.5 (macro)',
  f1_weighted: 'F1 (weighted)',
  balanced_accuracy: 'Balanced accuracy',
  mcc: 'MCC',
  kappa: "Cohen's kappa",
  rmse: 'RMSE',
  mae: 'MAE',
  mape: 'MAPE, %',
  r2: 'R²',
  medae: 'MedAE',
  max_error: 'Max error',
  skill_avg: 'Skill (avg)',
  mae_avg: 'MAE (avg)',
}

export function categoryFromTask(task: string): Category {
  if (task.startsWith('classification_')) return 'classification'
  if (task.startsWith('regression_')) return 'regression'
  return 'forecasting'
}

export function taskLabel(task: string): string {
  const cat = categoryFromTask(task)
  const prefix = cat === 'classification' ? 'classification_' : cat === 'regression' ? 'regression_' : 'forecasting_'
  return task.slice(prefix.length).replace(/_/g, ' ')
}

export function formatMetricValue(key: string, value: number): string {
  if (key === 'mape' || key === 'pct_beyond_2mae') return `${value.toFixed(2)}%`
  if (Math.abs(value) < 1 && Math.abs(value) > 0) return value.toFixed(4)
  return value.toFixed(3)
}