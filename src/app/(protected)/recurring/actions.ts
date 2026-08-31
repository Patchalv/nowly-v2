'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { calculateNextOccurrenceOnOrAfter } from '@/lib/utils/recurrence';
import type {
  CreateRecurringTaskInput,
  RecurrenceType,
  UpdateRecurringTaskInput,
} from '@/schemas/recurring-task';
import type { Database } from '@/types/database';

type RecurringTaskUpdate =
  Database['public']['Tables']['recurring_tasks']['Update'];
type RecurringTaskRow = Database['public']['Tables']['recurring_tasks']['Row'];

/**
 * Recurrence-defining fields. Editing any of these (and only these) means
 * the template's schedule itself changed, so next_due_date must be
 * recomputed. Editing anything else (title, description, start_date,
 * end_date, etc.) must never touch next_due_date.
 */
function recurrenceRuleChanged(
  next: {
    recurrence_type: RecurrenceType;
    interval_days?: number;
    interval_weeks?: number;
    interval_months?: number;
    days_of_week?: number[];
    day_of_month?: number;
    week_of_month?: number;
    month_of_year?: number;
  },
  existing: RecurringTaskRow
): boolean {
  const sameDaysOfWeek = (a?: number[] | null, b?: number[] | null) => {
    const normalize = (arr?: number[] | null) =>
      arr && arr.length > 0 ? [...arr].sort((x, y) => x - y) : null;
    const na = normalize(a);
    const nb = normalize(b);
    if (na === null || nb === null) return na === nb;
    return na.length === nb.length && na.every((v, i) => v === nb[i]);
  };

  return (
    next.recurrence_type !== existing.recurrence_type ||
    (next.interval_days ?? null) !== existing.interval_days ||
    (next.interval_weeks ?? null) !== existing.interval_weeks ||
    (next.interval_months ?? null) !== existing.interval_months ||
    (next.day_of_month ?? null) !== existing.day_of_month ||
    (next.week_of_month ?? null) !== existing.week_of_month ||
    (next.month_of_year ?? null) !== existing.month_of_year ||
    !sameDaysOfWeek(next.days_of_week, existing.days_of_week)
  );
}

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

    // Whitelist exactly the fields this action is allowed to write, so the
    // parameter type and the actual update payload can never drift apart.
    const recurringUpdate: RecurringTaskUpdate = {};
    if (data.title !== undefined) recurringUpdate.title = data.title;
    if (data.description !== undefined)
      recurringUpdate.description = data.description;
    if (data.category_id !== undefined)
      recurringUpdate.category_id = data.category_id;
    if (data.priority !== undefined) recurringUpdate.priority = data.priority;
    if (data.recurrence_type !== undefined)
      recurringUpdate.recurrence_type = data.recurrence_type;
    if (data.interval_days !== undefined)
      recurringUpdate.interval_days = data.interval_days;
    if (data.interval_weeks !== undefined)
      recurringUpdate.interval_weeks = data.interval_weeks;
    if (data.interval_months !== undefined)
      recurringUpdate.interval_months = data.interval_months;
    if (data.days_of_week !== undefined)
      recurringUpdate.days_of_week = data.days_of_week;
    if (data.day_of_month !== undefined)
      recurringUpdate.day_of_month = data.day_of_month;
    if (data.week_of_month !== undefined)
      recurringUpdate.week_of_month = data.week_of_month;
    if (data.month_of_year !== undefined)
      recurringUpdate.month_of_year = data.month_of_year;
    if (data.start_date !== undefined)
      recurringUpdate.start_date = data.start_date;
    if (data.end_date !== undefined) recurringUpdate.end_date = data.end_date;
    if (data.is_active !== undefined)
      recurringUpdate.is_active = data.is_active;

    // Any of these being present in the payload means the rule may have
    // changed - gating this on recurrence_type alone would silently skip
    // the recompute (and reintroduce a variant of this ticket's bug) for a
    // hypothetical future caller that patches e.g. just interval_days
    // without resending recurrence_type.
    const ruleFieldProvided =
      data.recurrence_type !== undefined ||
      data.interval_days !== undefined ||
      data.interval_weeks !== undefined ||
      data.interval_months !== undefined ||
      data.days_of_week !== undefined ||
      data.day_of_month !== undefined ||
      data.week_of_month !== undefined ||
      data.month_of_year !== undefined;

    if (ruleFieldProvided) {
      // day_of_month / week_of_month+days_of_week are mutually exclusive
      // ways of expressing a monthly pattern (days_of_week doubles as the
      // required field for a weekly pattern). The dialog always resends
      // whichever one currently applies as a complete unit, using
      // `undefined` to mean "not this pattern" rather than "unchanged" - so
      // if any of the three was touched, trust the payload for all three;
      // only fall back to the stored values when none of them were touched,
      // otherwise a partial patch to an unrelated field (e.g.
      // interval_months) would stack a new week_of_month on top of a stale
      // leftover day_of_month, or vice versa.
      const monthlyPatternProvided =
        data.day_of_month !== undefined ||
        data.week_of_month !== undefined ||
        data.days_of_week !== undefined;

      const nextRuleState = {
        recurrence_type: (data.recurrence_type ??
          existing.recurrence_type) as RecurrenceType,
        interval_days:
          data.interval_days ?? existing.interval_days ?? undefined,
        interval_weeks:
          data.interval_weeks ?? existing.interval_weeks ?? undefined,
        interval_months:
          data.interval_months ?? existing.interval_months ?? undefined,
        month_of_year:
          data.month_of_year ?? existing.month_of_year ?? undefined,
        day_of_month: monthlyPatternProvided
          ? data.day_of_month
          : (existing.day_of_month ?? undefined),
        week_of_month: monthlyPatternProvided
          ? data.week_of_month
          : (existing.week_of_month ?? undefined),
        days_of_week: monthlyPatternProvided
          ? data.days_of_week
          : (existing.days_of_week ?? undefined),
      };

      if (recurrenceRuleChanged(nextRuleState, existing)) {
        recurringUpdate.next_due_date = format(
          calculateNextOccurrenceOnOrAfter(nextRuleState, new Date()),
          'yyyy-MM-dd'
        );
      }
    }

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
