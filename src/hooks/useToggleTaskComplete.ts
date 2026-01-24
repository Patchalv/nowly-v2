import { useMutation } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Task } from '@/types/supabase';
import { useOnboarding, TooltipType } from '@/hooks/useOnboarding';

/**
 * Toggle task completion status
 * UI updates are handled optimistically by the calling component
 *
 * On first task completion, shows an enhanced toast with undo tip.
 */
export function useToggleTaskComplete() {
  const supabase = createClient();
  const { hasSeenTooltip, dismissTooltip } = useOnboarding();

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

    onSuccess: async ({ newIsCompleted }) => {
      // Show enhanced toast on first task completion
      if (newIsCompleted && !hasSeenTooltip(TooltipType.TASK_COMPLETION_UNDO)) {
        toast.success('Task completed!', {
          description: 'Tip: Press Ctrl+Z (Cmd+Z on Mac) to undo',
          duration: 5000,
        });

        // Mark tooltip as seen
        try {
          await dismissTooltip(TooltipType.TASK_COMPLETION_UNDO);
        } catch {
          // Ignore error - already logged in dismissTooltip
        }
      }
    },

    onError: (err) => {
      toast.error('Failed to update task', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    },
  });
}
