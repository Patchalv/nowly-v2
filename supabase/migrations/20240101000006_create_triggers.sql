-- =====================================================
-- RECURRING TASK GENERATION TRIGGER
-- Generate next recurring task instance when a task is completed
-- =====================================================

-- Generate next recurring task instance when a task is completed
CREATE OR REPLACE FUNCTION generate_next_recurring_instance()
RETURNS TRIGGER AS $
DECLARE
  template recurring_tasks%ROWTYPE;
  next_date DATE;
BEGIN
  -- Only trigger when task is completed
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE AND NEW.recurring_task_id IS NOT NULL THEN
    SELECT * INTO template FROM recurring_tasks WHERE id = NEW.recurring_task_id;

    IF template.is_active AND NOT template.is_paused THEN
      -- Calculate next date based on recurrence type
      CASE template.recurrence_type
        WHEN 'interval_from_completion' THEN
          next_date := CURRENT_DATE + template.interval_days;
        WHEN 'fixed_daily' THEN
          next_date := template.next_due_date + template.interval_days;
        WHEN 'fixed_weekly' THEN
          -- For weekly, find next occurrence based on days_of_week
          next_date := template.next_due_date + 7;
        WHEN 'fixed_monthly' THEN
          -- For monthly, use day_of_month
          next_date := (DATE_TRUNC('month', template.next_due_date) + INTERVAL '1 month' + (template.day_of_month - 1 || ' days')::INTERVAL)::DATE;
        ELSE
          next_date := template.next_due_date + template.interval_days;
      END CASE;

      -- Check if within end_date bounds
      IF template.end_date IS NULL OR next_date <= template.end_date THEN
        -- Create new task instance
        INSERT INTO tasks (
          user_id, workspace_id, category_id, recurring_task_id,
          title, description, priority, scheduled_date
        ) VALUES (
          template.user_id, template.workspace_id, template.category_id, template.id,
          template.title, template.description, template.priority, next_date
        );

        -- Update template's next_due_date
        UPDATE recurring_tasks
        SET next_due_date = next_date, occurrences_generated = occurrences_generated + 1
        WHERE id = template.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_task_completed ON public.tasks;
CREATE TRIGGER on_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION generate_next_recurring_instance();

-- Rollback:
-- DROP TRIGGER IF EXISTS on_task_completed ON public.tasks;
-- DROP FUNCTION IF EXISTS generate_next_recurring_instance();
