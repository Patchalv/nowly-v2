/**
 * User onboarding state from database.
 *
 * NOTE: After applying the migration, run `npm run db:types` to regenerate
 * database types. Once regenerated, this type will be properly inferred from
 * Database['public']['Tables']['user_onboarding']['Row'].
 *
 * Until then, this manual type definition matches the migration schema.
 */
export interface UserOnboarding {
  id: string;
  user_id: string;
  initial_tour_completed: boolean;
  initial_tour_completed_at: string | null;
  initial_tour_step_reached: number;
  dismissed_tooltips: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Alias for UserOnboarding - used throughout the onboarding system.
 */
export type OnboardingState = UserOnboarding;

/**
 * Insert type for creating new onboarding records.
 * Most fields have defaults, so only user_id is required.
 */
export interface UserOnboardingInsert {
  id?: string;
  user_id: string;
  initial_tour_completed?: boolean;
  initial_tour_completed_at?: string | null;
  initial_tour_step_reached?: number;
  dismissed_tooltips?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Update type for modifying onboarding records.
 * All fields are optional for partial updates.
 */
export interface UserOnboardingUpdate {
  id?: string;
  user_id?: string;
  initial_tour_completed?: boolean;
  initial_tour_completed_at?: string | null;
  initial_tour_step_reached?: number;
  dismissed_tooltips?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Contextual tooltip types that can be dismissed by users.
 * Each tooltip is shown once per user and tracked in dismissed_tooltips array.
 */
export enum TooltipType {
  /** Shown in TaskDialog to explain scheduled vs due dates */
  TASK_DIALOG_SCHEDULED_DUE = 'task_dialog_scheduled_due',
  /** Shown on first render of reschedule button */
  RESCHEDULE_BUTTON = 'reschedule_button',
  /** Shown as toast on first task completion */
  TASK_COMPLETION_UNDO = 'task_completion_undo',
}
