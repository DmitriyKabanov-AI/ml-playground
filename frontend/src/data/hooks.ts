import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { api } from './source'
import type { TaskMetrics, TaskSummary } from '../types'

export function useTasks(): UseQueryResult<TaskSummary[]> {
  return useQuery<TaskSummary[]>({
    queryKey: ['tasks'],
    queryFn: api.tasks,
  })
}

export function useTaskMetrics(task: string | undefined): UseQueryResult<TaskMetrics> {
  return useQuery<TaskMetrics>({
    queryKey: ['task-metrics', task],
    queryFn: () => api.taskMetrics(task as string),
    enabled: Boolean(task),
  })
}