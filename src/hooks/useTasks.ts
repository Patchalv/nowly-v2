import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch tasks for a specific scheduled date
 * Returns top-level tasks (no parent) with their category and subtasks
 */
export function useTasks(scheduledDate: string) {
  const supabase = createClient();

  return useQuery(
    supabase
      .from('tasks')
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        subtasks:tasks!parent_task_id(id, title, is_completed, position)
      `
      )
      .eq('scheduled_date', scheduledDate)
      .is('parent_task_id', null)
      .order('position', { ascending: true })
  );
}

/**
 * Fetch tasks for a date range
 * Useful for upcoming/calendar views
 */
export function useTasksForDateRange(startDate: string, endDate: string) {
  const supabase = createClient();

  return useQuery(
    supabase
      .from('tasks')
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        subtasks:tasks!parent_task_id(id, title, is_completed, position)
      `
      )
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .is('parent_task_id', null)
      .order('scheduled_date', { ascending: true })
      .order('position', { ascending: true })
  );
}

/**
 * Fetch inbox tasks (no scheduled date)
 * Tasks that haven't been scheduled yet
 */
export function useInboxTasks() {
  const supabase = createClient();

  return useQuery(
    supabase
      .from('tasks')
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        subtasks:tasks!parent_task_id(id, title, is_completed, position)
      `
      )
      .is('scheduled_date', null)
      .is('parent_task_id', null)
      .order('created_at', { ascending: false })
  );
}

/**
 * Fetch all tasks in a workspace
 * Includes all tasks regardless of scheduled date
 */
export function useWorkspaceTasks(workspaceId: string) {
  const supabase = createClient();

  return useQuery(
    supabase
      .from('tasks')
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        subtasks:tasks!parent_task_id(id, title, is_completed, position)
      `
      )
      .eq('workspace_id', workspaceId)
      .is('parent_task_id', null)
      .order('created_at', { ascending: false })
  );
}
