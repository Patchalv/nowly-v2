'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { buildRecurringTaskUpdate } from '@/lib/utils/recurring-task-update';
import type {
  CreateRecurringTaskInput,
  UpdateRecurringTaskInput,
} from '@/schemas/recurring-task';

/**
 * Create a new recurring task and generate the first task instance
 */
export async function createRecurringTaskWithInstance(
  data: Omit<CreateRecurringTaskInput, 'user_id'>
) {
  const supabase = await createClient();

  // Validate auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  try {
    // Create recurring task
    const { data: recurringTask, error: recurringError } = await supabase
      .from('recurring_tasks')
      .insert({
        ...data,
        user_id: user.id,
        is_active: data.is_active ?? true,
        is_paused: false,
        occurrences_generated: 0,
      })
      .select()
      .single();

    if (recurringError) {
      return { error: recurringError.message };
    }

    // Create first task instance
    const { error: taskError } = await supabase.from('tasks').insert({
      user_id: user.id,
      workspace_id: data.workspace_id,
      category_id: data.category_id || null,
      recurring_task_id: recurringTask.id,
      title: data.title,
      description: data.description || null,
      priority: data.priority || 0,
      scheduled_date: data.start_date,
      is_completed: false,
      position: 0,
      is_detached: false,
    });

    if (taskError) {
      // Rollback: delete the recurring task if task creation fails
      await supabase
        .from('recurring_tasks')
        .delete()
        .eq('id', recurringTask.id);
      return { error: taskError.message };
    }

    // Update occurrences count
    await supabase
      .from('recurring_tasks')
      .update({ occurrences_generated: 1 })
      .eq('id', recurringTask.id);

    revalidatePath('/recurring');
    revalidatePath('/today');
    revalidatePath('/daily');
    return { success: true, data: recurringTask };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create recurring task',
    };
  }
}

/**
 * Update a recurring task and all uncompleted task instances
 *
 * `next_due_date` is deliberately not part of the accepted input: it is set
 * once on create and otherwise only ever recomputed here, and only when the
 * recurrence rule itself changed (never rewound to start_date).
 */
export async function updateRecurringTaskAndInstances(
  id: string,
  data: Omit<UpdateRecurringTaskInput, 'id' | 'next_due_date'>
) {
  const supabase = await createClient();

  // Validate auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return { error: fetchError?.message ?? 'Recurring task not found' };
    }

    // Whitelists exactly the fields this action is allowed to write and
    // recomputes next_due_date itself (see recurring-task-update.ts) so the
    // parameter type and the actual update payload can never drift apart.
    const recurringUpdate = buildRecurringTaskUpdate(data, existing);

    // Update recurring task master
    const { error: recurringError } = await supabase
      .from('recurring_tasks')
      .update(recurringUpdate)
      .eq('id', id)
      .eq('user_id', user.id);

    if (recurringError) {
      return { error: recurringError.message };
    }

    // Update all uncompleted task instances
    const updateData: {
      title?: string;
      description?: string | null;
      category_id?: string | null;
      priority?: number;
    } = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.category_id !== undefined)
      updateData.category_id = data.category_id;
    if (data.priority !== undefined) updateData.priority = data.priority;

    if (Object.keys(updateData).length > 0) {
      const { error: tasksError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('recurring_task_id', id)
        .eq('user_id', user.id)
        .eq('is_completed', false);

      if (tasksError) {
        return { error: tasksError.message };
      }
    }

    revalidatePath('/recurring');
    revalidatePath('/today');
    revalidatePath('/daily');
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update recurring task',
    };
  }
}

/**
 * Delete a recurring task and all uncompleted task instances
 */
export async function deleteRecurringTaskAndInstances(id: string) {
  const supabase = await createClient();

  // Validate auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  try {
    // Delete all uncompleted task instances
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('recurring_task_id', id)
      .eq('user_id', user.id)
      .eq('is_completed', false);

    if (tasksError) {
      return { error: tasksError.message };
    }

    // Delete recurring task
    const { error: recurringError } = await supabase
      .from('recurring_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (recurringError) {
      return { error: recurringError.message };
    }

    revalidatePath('/recurring');
    revalidatePath('/today');
    revalidatePath('/daily');
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete recurring task',
    };
  }
}
