import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Task } from '@/types/supabase';

/**
 * Toggle task completion status
 * UI updates are handled optimistically by the calling component
 */
export function useToggleTaskComplete() {
  const supabase = createClient();

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

    onError: (err) => {
      toast.error('Failed to update task', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    },
  });
}
