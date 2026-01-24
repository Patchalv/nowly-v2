'use client';

import { useCallback, useMemo, useEffect } from 'react';
import {
  useQuery,
  useUpdateMutation,
} from '@supabase-cache-helpers/postgrest-react-query';
// Note: useQueryClient removed - using refetch from useQuery instead
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/errors/supabase-error-handler';
import type { OnboardingState } from '@/types/onboarding';
import { TooltipType } from '@/types/onboarding';

/**
 * Hook for managing user onboarding state.
 *
 * Provides:
 * - Current onboarding state from database
 * - `shouldShowTour` - whether to show the initial tour
 * - `completeTour` - mutation to mark tour as complete
 * - `dismissTooltip` - function to dismiss a contextual tooltip
 * - `hasSeenTooltip` - check if a tooltip has been dismissed
 *
 * @example
 * ```tsx
 * const { shouldShowTour, completeTour, hasSeenTooltip, dismissTooltip } = useOnboarding();
 *
 * if (shouldShowTour) {
 *   // Show onboarding tour
 * }
 *
 * // After tour completes:
 * completeTour.mutate();
 *
 * // For contextual tooltips:
 * if (!hasSeenTooltip(TooltipType.TASK_DIALOG_SCHEDULED_DUE)) {
 *   // Show tooltip
 *   await dismissTooltip(TooltipType.TASK_DIALOG_SCHEDULED_DUE);
 * }
 * ```
 */
export function useOnboarding() {
  const supabase = createClient();

  // Fetch onboarding state (RLS ensures we only get our own record)
  const {
    data,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery(supabase.from('user_onboarding').select('*').single());

  // Log fetch errors in useEffect to avoid re-logging on every render
  useEffect(() => {
    if (fetchError) {
      handleSupabaseError(fetchError, {
        table: 'user_onboarding',
        operation: 'select',
        source: 'useOnboarding',
      });
    }
  }, [fetchError]);

  // Mutation to update onboarding record
  const updateMutation = useUpdateMutation(
    supabase.from('user_onboarding'),
    ['id'],
    null,
    {
      onError: (error) => {
        handleSupabaseError(error, {
          table: 'user_onboarding',
          operation: 'update',
          source: 'useOnboarding.updateMutation',
        });
      },
    }
  );

  // Computed: should we show the tour?
  const shouldShowTour = useMemo(() => {
    if (isLoading || !data) return false;
    return !data.initial_tour_completed;
  }, [data, isLoading]);

  /**
   * Mark the initial tour as complete.
   * Call this when the user finishes or skips the tour.
   */
  const completeTour = useMemo(() => {
    return {
      ...updateMutation,
      mutate: () => {
        if (!data?.id) return;

        Sentry.addBreadcrumb({
          category: 'onboarding',
          message: 'Marking tour as complete',
          level: 'info',
        });

        updateMutation.mutate({
          id: data.id,
          initial_tour_completed: true,
          initial_tour_completed_at: new Date().toISOString(),
        });
      },
      mutateAsync: async () => {
        if (!data?.id) return;

        Sentry.addBreadcrumb({
          category: 'onboarding',
          message: 'Marking tour as complete',
          level: 'info',
        });

        await updateMutation.mutateAsync({
          id: data.id,
          initial_tour_completed: true,
          initial_tour_completed_at: new Date().toISOString(),
        });
      },
    };
  }, [data?.id, updateMutation]);

  /**
   * Check if a tooltip has been dismissed by the user.
   */
  const hasSeenTooltip = useCallback(
    (tooltipType: TooltipType): boolean => {
      if (!data?.dismissed_tooltips) return false;
      return data.dismissed_tooltips.includes(tooltipType);
    },
    [data?.dismissed_tooltips]
  );

  /**
   * Dismiss a contextual tooltip (add to dismissed_tooltips array).
   * The tooltip won't be shown again after being dismissed.
   */
  const dismissTooltip = useCallback(
    async (tooltipType: TooltipType): Promise<void> => {
      if (!data?.id) return;

      // Don't dismiss if already dismissed
      if (hasSeenTooltip(tooltipType)) return;

      Sentry.addBreadcrumb({
        category: 'onboarding',
        message: `Dismissing tooltip: ${tooltipType}`,
        level: 'info',
      });

      const updatedTooltips = [...(data.dismissed_tooltips || []), tooltipType];

      try {
        const { error } = await supabase
          .from('user_onboarding')
          .update({ dismissed_tooltips: updatedTooltips })
          .eq('id', data.id);

        if (error) {
          handleSupabaseError(error, {
            table: 'user_onboarding',
            operation: 'update',
            source: 'useOnboarding.dismissTooltip',
            metadata: { tooltipType },
          });
          throw error;
        }

        // Refetch to get updated data
        await refetch();
      } catch (err) {
        // Error already logged, just re-throw
        throw err;
      }
    },
    [data?.id, data?.dismissed_tooltips, hasSeenTooltip, supabase, refetch]
  );

  return {
    /** Current onboarding state from database */
    data: data as OnboardingState | null,
    /** Loading state for initial fetch */
    isLoading,
    /** Whether to show the initial onboarding tour */
    shouldShowTour,
    /** Mutation to mark tour as complete */
    completeTour,
    /** Check if a tooltip has been dismissed */
    hasSeenTooltip,
    /** Dismiss a contextual tooltip */
    dismissTooltip,
  };
}

// Re-export TooltipType for convenience
export { TooltipType };
