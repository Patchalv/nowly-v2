import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch tasks for a specific scheduled date
 * Returns top-level tasks (no parent) with their category and subtasks
 * @param scheduledDate - ISO date string
 * @param workspaceId - Optional workspace filter (null = all workspaces)
 */
export function useTasks(scheduledDate: string, workspaceId?: string | null) {
  const supabase = createClient();

  let query = supabase
    .from('tasks')
    .select(
      `
        *,
        category:categories(id, name, color, icon),
        subtasks:tasks!parent_task_id(id, title, is_completed, position)
      `
    )
    .eq('scheduled_date', scheduledDate)
    .is('parent_task_id', null);

  // Apply workspace filter if specified (skip if null/"Master")
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  return useQuery(query.order('position', { ascending: true }));
}

/**
 * Fetch tasks for a date range
 * Useful for upcoming/calendar views
 * @param workspaceId - Optional workspace filter (null = all workspaces)
 */
export function useTasksForDateRange(
  startDate: string,
  endDate: string,
  workspaceId?: string | null
) {
  const supabase = createClient();

  let query = supabase
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
    .is('parent_task_id', null);

  // Apply workspace filter if specified
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  return useQuery(
    query
      .order('scheduled_date', { ascending: true })
      .order('position', { ascending: true })
  );
}

/**
 * Fetch inbox tasks (no scheduled date)
 * Tasks that haven't been scheduled yet
 * @param workspaceId - Optional workspace filter (null = all workspaces)
 */
export function useInboxTasks(workspaceId?: string | null) {
  const supabase = createClient();

  let query = supabase
    .from('tasks')
    .select(
      `
        *,
        category:categories(id, name, color, icon),
        subtasks:tasks!parent_task_id(id, title, is_completed, position)
      `
    )
    .is('scheduled_date', null)
    .is('parent_task_id', null);

  // Apply workspace filter if specified
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  return useQuery(query.order('created_at', { ascending: false }));
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

/**
 * Fetch tasks for the Today view
 * Returns tasks scheduled for today or in the past
 * Client-side filtering applies completion logic:
 * - Uncompleted: show all (today + overdue)
 * - Completed: show only today's completed tasks
 * @param workspaceId - Optional workspace filter (null = all workspaces)
 */
export function useTodayTasks(todayDate: string, workspaceId?: string | null) {
  const supabase = createClient();

  let query = supabase
    .from('tasks')
    .select(
      `
        *,
        category:categories(id, name, color, icon),
        subtasks:tasks!parent_task_id(id, title, is_completed, position)
      `
    )
    .lte('scheduled_date', todayDate)
    .is('parent_task_id', null);

  // Apply workspace filter if specified
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  return useQuery(
    query
      .order('scheduled_date', { ascending: true })
      .order('position', { ascending: true })
  );
}
