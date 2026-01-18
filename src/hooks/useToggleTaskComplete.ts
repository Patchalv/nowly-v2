import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Task } from '@/types/supabase';

/**
 * Toggle task completion status with optimistic update and undo functionality
 * Shows a toast notification with an undo action
 */
export function useToggleTaskComplete() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Task) => {
      const newIsCompleted = !task.is_completed;

      const { error } = await supabase
        .from('tasks')
        .update({
          is_completed: newIsCompleted,
          completed_at: newIsCompleted ? new Date().toISOString() : null,
        })
        .eq('id', task.id);

      if (error) throw error;

      return { task, newIsCompleted };
    },

    onMutate: async (task) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot previous value for rollback
      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'] });

      // Optimistically update all task queries
      queryClient.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old;
        return old.map((t) =>
          t.id === task.id
            ? {
                ...t,
                is_completed: !t.is_completed,
                completed_at: !t.is_completed ? new Date().toISOString() : null,
              }
            : t
        );
      });

      return { previousTasks };
    },

    onError: (err, task, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.error('Failed to update task', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    },

    onSuccess: (data) => {
      const { task, newIsCompleted } = data;

      // Show success toast with undo action
      toast.success(newIsCompleted ? 'Task completed' : 'Task reopened', {
        description: task.title,
        action: {
          label: 'Undo',
          onClick: () => {
            // Call the mutation again to toggle back
            supabase
              .from('tasks')
              .update({
                is_completed: !newIsCompleted,
                completed_at: !newIsCompleted ? new Date().toISOString() : null,
              })
              .eq('id', task.id)
              .then(() => {
                // Invalidate queries after undo
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
              });
          },
        },
      });
    },

    onSettled: () => {
      // Refetch after mutation to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
