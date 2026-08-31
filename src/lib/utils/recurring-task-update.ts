import { format } from 'date-fns';
import { calculateNextOccurrenceOnOrAfter } from './recurrence';
import type {
  RecurrenceType,
  UpdateRecurringTaskInput,
} from '@/schemas/recurring-task';
import type { Database } from '@/types/database';

type RecurringTaskRow = Database['public']['Tables']['recurring_tasks']['Row'];

/**
 * Exactly the recurring_tasks columns updateRecurringTaskAndInstances is
 * allowed to write. Declaring the update payload with this type (instead of
 * the full generated Update type, which covers every column including
 * user_id, occurrences_generated, timestamps, etc.) means the compiler - not
 * just the discipline of the code below - rejects any attempt to assign a
 * column outside this list.
 */
export type RecurringTaskUpdateFields = Pick<
  Database['public']['Tables']['recurring_tasks']['Update'],
  | 'title'
  | 'description'
  | 'category_id'
  | 'priority'
  | 'recurrence_type'
  | 'interval_days'
  | 'interval_weeks'
  | 'interval_months'
  | 'days_of_week'
  | 'day_of_month'
  | 'week_of_month'
  | 'month_of_year'
  | 'start_date'
  | 'end_date'
  | 'is_active'
  | 'next_due_date'
>;

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
 * Builds the recurring_tasks update payload for an edit: whitelists exactly
 * the allowed fields from `data`, and recomputes next_due_date itself
 * (rather than accepting it from the caller) - but only when a recurrence
 * rule field actually changed, and only ever forward to the next occurrence
 * at or after today, never back to start_date.
 *
 * Pure and Supabase-free so it can be exercised directly (e.g. in a
 * verification harness) without a live Supabase/Next.js request context.
 */
export function buildRecurringTaskUpdate(
  data: Omit<UpdateRecurringTaskInput, 'id' | 'next_due_date'>,
  existing: RecurringTaskRow
): RecurringTaskUpdateFields {
  const update: RecurringTaskUpdateFields = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.category_id !== undefined) update.category_id = data.category_id;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.recurrence_type !== undefined)
    update.recurrence_type = data.recurrence_type;
  if (data.interval_days !== undefined)
    update.interval_days = data.interval_days;
  if (data.interval_weeks !== undefined)
    update.interval_weeks = data.interval_weeks;
  if (data.interval_months !== undefined)
    update.interval_months = data.interval_months;
  if (data.days_of_week !== undefined) update.days_of_week = data.days_of_week;
  if (data.day_of_month !== undefined) update.day_of_month = data.day_of_month;
  if (data.week_of_month !== undefined)
    update.week_of_month = data.week_of_month;
  if (data.month_of_year !== undefined)
    update.month_of_year = data.month_of_year;
  if (data.start_date !== undefined) update.start_date = data.start_date;
  if (data.end_date !== undefined) update.end_date = data.end_date;
  if (data.is_active !== undefined) update.is_active = data.is_active;

  // Any of these being present in the payload means the rule may have
  // changed - gating this on recurrence_type alone would silently skip the
  // recompute (and reintroduce a variant of this ticket's bug) for a
  // hypothetical future caller that patches e.g. just interval_days without
  // resending recurrence_type.
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
    // day_of_month / week_of_month+days_of_week are mutually exclusive ways
    // of expressing a monthly pattern (days_of_week doubles as the required
    // field for a weekly pattern). The dialog always resends whichever one
    // currently applies as a complete unit, using `undefined` to mean "not
    // this pattern" rather than "unchanged" - so if any of the three was
    // touched, trust the payload for all three; only fall back to the
    // stored values when none of them were touched, otherwise a partial
    // patch to an unrelated field (e.g. interval_months) would stack a new
    // week_of_month on top of a stale leftover day_of_month, or vice versa.
    const monthlyPatternProvided =
      data.day_of_month !== undefined ||
      data.week_of_month !== undefined ||
      data.days_of_week !== undefined;

    const nextRuleState = {
      recurrence_type: (data.recurrence_type ??
        existing.recurrence_type) as RecurrenceType,
      interval_days: data.interval_days ?? existing.interval_days ?? undefined,
      interval_weeks:
        data.interval_weeks ?? existing.interval_weeks ?? undefined,
      interval_months:
        data.interval_months ?? existing.interval_months ?? undefined,
      month_of_year: data.month_of_year ?? existing.month_of_year ?? undefined,
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
      update.next_due_date = format(
        calculateNextOccurrenceOnOrAfter(nextRuleState, new Date()),
        'yyyy-MM-dd'
      );
    }
  }

  return update;
}
