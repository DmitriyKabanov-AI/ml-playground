import type { ActiveModel, HealthResponse, ModelRow, TaskMetrics, TaskSummary } from '../types'

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(text || `Request failed: ${res.status}`, res.status)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: (): Promise<HealthResponse> => request<HealthResponse>('/health'),
  tasks: (): Promise<TaskSummary[]> => request<TaskSummary[]>('/tasks'),
  taskModels: (task: string): Promise<ModelRow[]> => request<ModelRow[]>(`/tasks/${task}/models`),
  taskActive: (task: string): Promise<ActiveModel> => request<ActiveModel>(`/tasks/${task}/active`),
  taskMetrics: (task: string): Promise<TaskMetrics> => request<TaskMetrics>(`/tasks/${task}/metrics`),
}