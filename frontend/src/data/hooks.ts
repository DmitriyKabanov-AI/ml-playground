import { useQuery } from '@tanstack/react-query';
import { loadTaskMetrics, loadTasks } from '@/data/source';

export const useTasks = () =>
  useQuery({ queryKey: ['tasks'], queryFn: loadTasks });

export const useTaskMetrics = (task: string | undefined) =>
  useQuery({
    queryKey: ['task', task],
    queryFn: () => loadTaskMetrics(task!),
    enabled: !!task,
  });