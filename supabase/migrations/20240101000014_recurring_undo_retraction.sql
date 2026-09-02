-- =====================================================
-- FIX: UNDO THEN RE-COMPLETE A RECURRING TASK GENERATES
-- A DUPLICATE INSTANCE
--
-- Problem: the completion trigger only handled the
-- FALSE -> TRUE transition on tasks.is_completed. Un-completing
-- a task did nothing, so the instance that completion had
-- already generated was left in place *and* recurring_tasks
-- .next_due_date stayed advanced past the un-completed task's
-- own scheduled_date. Completing the task again then advanced
-- the cursor a second time and inserted a second instance (at a
-- later date than the first, since the cursor had already moved),
-- double-incrementing occurrences_generated in the process.
--
-- Fix: on the TRUE -> FALSE transition, retract the instance this
-- task's own completion generated -- but only when it is still
-- exactly as generated (uncompleted, not detached, not itself
-- edited or removed since). The app keeps exactly one active
-- (uncompleted) instance per template at a time, and that
-- instance's scheduled_date always equals recurring_tasks
-- .next_due_date, so that equality is what identifies "the row
-- this completion produced" without needing a new column to link
-- a completion event to the row it generated.
--
-- If that row can't be found untouched -- the user completed it,
-- edited it (is_detached), deleted it, or a different completion
-- of the same template already advanced the cursor further -- the
-- undo does nothing at all. Never deleting or altering a row we
-- can't prove is the untouched auto-generated one matters more
-- than closing every possible duplicate in these rarer cases.
--
-- This also covers a chain of several completions before an earlier
-- one is undone (e.g. today's and yesterday's occurrence both got
-- completed, then yesterday's is undone): retraction only runs when
-- the task being undone is the most recently completed instance on
-- the template, so undoing an older completion never reaches past a
-- later, still-completed one to delete something it didn't generate.
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_next_recurring_instance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template public.recurring_tasks%ROWTYPE;
  next_date DATE;
  prev_date DATE;
  iterations INTEGER;
  -- Generous enough for ~54 years of daily occurrences. Each iteration is
  -- pure date math (~2us), so exhausting the budget costs tens of ms.
  max_iterations CONSTANT INTEGER := 20000;
  generated_instance_id UUID;
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE AND NEW.recurring_task_id IS NOT NULL THEN
    -- FOR UPDATE serializes concurrent completions of the same template.
    -- Without it, two overlapping transactions both read the same cursor
    -- and generate duplicate instances for the same date.
    -- user_id = NEW.user_id enforces tenant ownership: without it, a task
    -- row whose recurring_task_id was pointed at another tenant's template
    -- would still be FOUND, letting a completion insert or advance that
    -- other tenant's recurring state.
    SELECT * INTO template FROM public.recurring_tasks
      WHERE id = NEW.recurring_task_id AND user_id = NEW.user_id FOR UPDATE;

    -- Only generate if template exists, is active, and not paused
    IF FOUND AND template.is_active AND NOT template.is_paused THEN
      IF template.recurrence_type = 'interval_from_completion' THEN
        -- N days after task completion (from today, not from scheduled date).
        -- Already relative to today, so no catch-up is needed.
        next_date := CURRENT_DATE + COALESCE(template.interval_days, 1);
      ELSE
        next_date := public.calculate_next_recurrence(template, template.next_due_date);

        -- Catch up: skip occurrences that are already in the past, so the
        -- generated instance is always strictly in the future and cannot
        -- reappear in the Today view (which shows scheduled_date <= today).
        iterations := 0;
        WHILE next_date IS NOT NULL AND next_date <= CURRENT_DATE AND iterations < max_iterations LOOP
          prev_date := next_date;
          next_date := public.calculate_next_recurrence(template, next_date);

          -- Bail out if a malformed template stops advancing, otherwise
          -- this would loop forever inside the trigger.
          EXIT WHEN next_date IS NULL OR next_date <= prev_date;

          iterations := iterations + 1;
        END LOOP;
      END IF;

      IF next_date IS NULL OR next_date <= CURRENT_DATE THEN
        -- Both loop exits above (budget exhausted, or a template that stops
        -- advancing) leave next_date in the past. Generating it would
        -- recreate the exact defect this migration fixes: a task that
        -- disappears on completion and immediately returns. Skip it and
        -- surface the bad template in the logs instead.
        RAISE WARNING 'generate_next_recurring_instance: no future occurrence for recurring_task % (type %, cursor %); computed %',
          template.id, template.recurrence_type, template.next_due_date, next_date;

      ELSIF template.end_date IS NULL OR next_date <= template.end_date THEN
        -- Create new task instance
        INSERT INTO public.tasks (
          user_id, workspace_id, category_id, recurring_task_id,
          title, description, priority, scheduled_date
        ) VALUES (
          template.user_id, template.workspace_id, template.category_id, template.id,
          template.title, template.description, template.priority, next_date
        );

        -- Update template's next_due_date and increment counter
        UPDATE public.recurring_tasks
        SET next_due_date = next_date, occurrences_generated = occurrences_generated + 1
        WHERE id = template.id;
      END IF;
      -- Past end_date: nothing to generate, the schedule is exhausted.
    END IF;

  ELSIF NEW.is_completed = FALSE AND OLD.is_completed = TRUE AND NEW.recurring_task_id IS NOT NULL THEN
    -- Undo: retract the instance this task's own completion generated, so
    -- a later re-completion does not produce a second one.
    -- user_id = NEW.user_id: see matching note on the completion branch
    -- above. Without it, a task pointed at another tenant's template could
    -- reach the delete below via a template row we don't own.
    SELECT * INTO template FROM public.recurring_tasks
      WHERE id = NEW.recurring_task_id AND user_id = NEW.user_id FOR UPDATE;

    -- Only retract when this is the most recently completed instance on the
    -- template. If a later instance was completed since (a chain of several
    -- completions before an earlier one gets undone), the current cursor
    -- was advanced by that later completion, not this one, and must not be
    -- touched here. OLD.completed_at is nullable at the schema level (the
    -- app always sets it, but the DB does not enforce that): if it is NULL
    -- here, "completed_at > OLD.completed_at" is unknown for every row, so
    -- NOT EXISTS would wrongly read as "no later completion" even when one
    -- exists. Require it non-null and skip retraction otherwise.
    IF FOUND AND OLD.completed_at IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE recurring_task_id = NEW.recurring_task_id
        AND id <> NEW.id
        AND is_completed = TRUE
        -- completed_at IS NULL OR ...: a same-template row that is
        -- completed but has an unknown completed_at cannot be proven
        -- earlier than OLD.completed_at ("completed_at > OLD.completed_at"
        -- is itself unknown, not true, for such a row) -- excluding it
        -- here would make it invisible to this guard and let retraction
        -- proceed past a completion that, for all we know, actually is
        -- later. Treat an unknown timestamp as a possible later completion
        -- and block on it, matching this migration's fail-closed stance
        -- everywhere else (never touch a row we can't prove is safe to).
        AND (completed_at IS NULL OR completed_at > OLD.completed_at)
    ) THEN
      -- The generated instance is identified structurally: it is the sole
      -- other uncompleted, non-detached task on this template, sitting
      -- exactly on the template's current cursor, with that cursor still
      -- strictly ahead of this task's own date (i.e. nothing else has
      -- moved it since). Any deviation from that -- the user completed it,
      -- edited it, deleted it, or another completion advanced the cursor
      -- further -- means we can no longer prove it is the untouched
      -- auto-generated row, so it is left alone.
      --
      -- user_id = template.user_id (== NEW.user_id, already enforced by
      -- the template lookup above): recurring_task_id alone does not
      -- prove ownership -- a row belonging to a different tenant could
      -- otherwise be pointed at this same template id and, if it lands on
      -- the same scheduled_date, be selected and deleted here instead of
      -- the real generated instance, corrupting this tenant's cursor
      -- while leaving another tenant's data deleted.
      SELECT id INTO generated_instance_id
        FROM public.tasks
        WHERE recurring_task_id = NEW.recurring_task_id
          AND user_id = template.user_id
          AND id <> NEW.id
          AND is_completed = FALSE
          AND is_detached = FALSE
          AND scheduled_date = template.next_due_date
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

      IF generated_instance_id IS NOT NULL AND template.next_due_date > NEW.scheduled_date THEN
        DELETE FROM public.tasks WHERE id = generated_instance_id;

        UPDATE public.recurring_tasks
        SET next_due_date = NEW.scheduled_date,
            occurrences_generated = GREATEST(occurrences_generated - 1, 0)
        WHERE id = template.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists and uses the updated function
DROP TRIGGER IF EXISTS on_task_completed ON public.tasks;
CREATE TRIGGER on_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.generate_next_recurring_instance();

-- =====================================================
-- Rollback:
-- Restore generate_next_recurring_instance() from migration
-- 20240101000013_recurring_catchup.sql (drops the ELSIF branch above;
-- calculate_next_recurrence() and its REVOKE are untouched by this
-- migration and need no rollback).
-- =====================================================
