import type { TaskMetrics, TaskSummary } from '@/types';

const API = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) {
    let detail = '';
    try {
      const j = (await r.json()) as { detail?: string };
      detail = j.detail ? ` — ${j.detail}` : '';
    } catch { /* ignore */ }
    throw new Error(`${path}: HTTP ${r.status}${detail}`);
  }
  return r.json() as Promise<T>;
}

export const loadTasks = () => getJson<TaskSummary[]>('/tasks');
export const loadTaskMetrics = (task: string) => getJson<TaskMetrics>(`/tasks/${task}/metrics`);