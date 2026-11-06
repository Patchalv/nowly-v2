-- =====================================================
-- FIX: RECURRING TASK TRIGGER - MISSING ELSE CLAUSE
-- Fixes PostgreSQL error 20000: "case not found"
-- when completing tasks with fixed_weekly or fixed_monthly
-- recurrence types.
--
-- This migration ensures all recurrence types are handled
-- and adds security best practices (SET search_path).
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_next_recurring_instance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template public.recurring_tasks%ROWTYPE;
  next_date DATE;
  target_dow INTEGER;
  week_interval INTEGER;
  month_interval INTEGER;
  target_week INTEGER;
  first_of_month DATE;
  temp_date DATE;
  adjusted_dow INTEGER;
  occurrence_count INTEGER;
BEGIN
  -- Only trigger when task is completed (not when uncompleting)
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE AND NEW.recurring_task_id IS NOT NULL THEN
    SELECT * INTO template FROM public.recurring_tasks WHERE id = NEW.recurring_task_id;

    -- Only generate if template exists, is active, and not paused
    IF FOUND AND template.is_active AND NOT template.is_paused THEN
      -- Calculate next date based on recurrence type
      CASE template.recurrence_type
        WHEN 'interval_from_completion' THEN
          -- N days after task completion (from today, not from scheduled date)
          next_date := CURRENT_DATE + COALESCE(template.interval_days, 1);

        WHEN 'fixed_daily' THEN
          -- Every N days from last due date (maintains fixed schedule)
          next_date := template.next_due_date + COALESCE(template.interval_days, 1);

        WHEN 'fixed_weekly' THEN
          -- Every X weeks on specific weekday(s)
          week_interval := COALESCE(template.interval_weeks, 1);

          -- Start searching from day after current due date
          temp_date := template.next_due_date + 1;

          -- Loop to find next valid date
          LOOP
            -- Convert PostgreSQL DOW (0=Sun, 1=Mon, ..., 6=Sat) to our format (0=Mon, ..., 6=Sun)
            adjusted_dow := CASE EXTRACT(DOW FROM temp_date)::INTEGER
              WHEN 0 THEN 6  -- Sunday -> 6
              ELSE EXTRACT(DOW FROM temp_date)::INTEGER - 1
            END;

            -- Check if this day is in our selected days
            IF template.days_of_week IS NOT NULL AND adjusted_dow = ANY(template.days_of_week) THEN
              -- For interval > 1, check if we've passed enough weeks
              -- The minimum gap should be (interval_weeks - 1) * 7 + 1 days
              IF week_interval = 1 OR (temp_date - template.next_due_date) >= ((week_interval - 1) * 7 + 1) THEN
                next_date := temp_date;
                EXIT;
              END IF;
            END IF;

            temp_date := temp_date + 1;

            -- Safety: don't loop more than 8 weeks
            IF temp_date > template.next_due_date + 60 THEN
              -- Fallback: just add interval weeks
              next_date := template.next_due_date + (week_interval * 7);
              EXIT;
            END IF;
          END LOOP;

        WHEN 'fixed_monthly' THEN
          -- Every X months on specific day or Nth weekday
          month_interval := COALESCE(template.interval_months, 1);
          first_of_month := (DATE_TRUNC('month', template.next_due_date) + (month_interval || ' months')::INTERVAL)::DATE;

          IF template.week_of_month IS NOT NULL AND template.days_of_week IS NOT NULL AND array_length(template.days_of_week, 1) > 0 THEN
            -- Nth weekday of month (e.g., "first Sunday", "last Friday")
            target_dow := template.days_of_week[1];  -- Use first selected day
            target_week := template.week_of_month;

            IF target_week = -1 THEN
              -- Last occurrence of weekday in month
              -- Start from last day of month and work backwards
              temp_date := (first_of_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

              LOOP
                adjusted_dow := CASE EXTRACT(DOW FROM temp_date)::INTEGER
                  WHEN 0 THEN 6
                  ELSE EXTRACT(DOW FROM temp_date)::INTEGER - 1
                END;

                IF adjusted_dow = target_dow THEN
                  next_date := temp_date;
                  EXIT;
                END IF;

                temp_date := temp_date - 1;

                -- Safety: don't go before first of month
                IF temp_date < first_of_month THEN
                  next_date := first_of_month;
                  EXIT;
                END IF;
              END LOOP;
            ELSE
              -- Nth occurrence (1st, 2nd, 3rd, 4th, 5th)
              temp_date := first_of_month;
              occurrence_count := 0;

              LOOP
                adjusted_dow := CASE EXTRACT(DOW FROM temp_date)::INTEGER
                  WHEN 0 THEN 6
                  ELSE EXTRACT(DOW FROM temp_date)::INTEGER - 1
                END;

                IF adjusted_dow = target_dow THEN
                  occurrence_count := occurrence_count + 1;
                  IF occurrence_count = target_week THEN
                    next_date := temp_date;
                    EXIT;
                  END IF;
                END IF;

                temp_date := temp_date + 1;

                -- Safety: don't go beyond current month
                IF temp_date >= first_of_month + INTERVAL '1 month' THEN
                  -- Target week doesn't exist (e.g., 5th Monday doesn't exist)
                  -- Fall back to last occurrence
                  temp_date := (first_of_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
                  FOR i IN 1..31 LOOP
                    adjusted_dow := CASE EXTRACT(DOW FROM temp_date)::INTEGER
                      WHEN 0 THEN 6
                      ELSE EXTRACT(DOW FROM temp_date)::INTEGER - 1
                    END;
                    IF adjusted_dow = target_dow THEN
                      next_date := temp_date;
                      EXIT;
                    END IF;
                    temp_date := temp_date - 1;
                    IF temp_date < first_of_month THEN
                      next_date := first_of_month;
                      EXIT;
                    END IF;
                  END LOOP;
                  EXIT;
                END IF;
              END LOOP;
            END IF;
          ELSE
            -- Specific day of month (e.g., "15th of every month")
            IF template.day_of_month = 31 THEN
              -- Last day of month
              next_date := (first_of_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
            ELSE
              -- Clamp day_of_month to last day of month for short months (e.g., Feb 30 -> Feb 28)
              next_date := LEAST(
                (first_of_month + (COALESCE(template.day_of_month, 1) - 1 || ' days')::INTERVAL)::DATE,
                (first_of_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE
              );
            END IF;
          END IF;

        WHEN 'fixed_yearly' THEN
          -- Same month/day every year
          next_date := template.next_due_date + INTERVAL '1 year';

          -- Apply specific month if set
          IF template.month_of_year IS NOT NULL THEN
            next_date := (DATE_TRUNC('year', next_date) + ((template.month_of_year - 1) || ' months')::INTERVAL)::DATE;
          END IF;

          -- Apply specific day if set, clamped to last day of month
          IF template.day_of_month IS NOT NULL THEN
            next_date := LEAST(
              (DATE_TRUNC('month', next_date) + ((template.day_of_month - 1) || ' days')::INTERVAL)::DATE,
              (DATE_TRUNC('month', next_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
            );
          END IF;

        ELSE
          -- Unknown recurrence type: use interval_days as fallback
          -- This prevents the "case not found" error
          next_date := template.next_due_date + COALESCE(template.interval_days, 1);
      END CASE;

      -- Only create new instance if next_date was calculated and within bounds
      IF next_date IS NOT NULL AND (template.end_date IS NULL OR next_date <= template.end_date) THEN
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
-- Restore previous trigger function from migration 20240101000010
-- =====================================================
