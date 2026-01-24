'use client';

import { useEffect, useRef, useCallback } from 'react';
import { driver, type Driver } from 'driver.js';
import * as Sentry from '@sentry/nextjs';

import { useOnboarding, TooltipType } from '@/hooks/useOnboarding';

interface ContextualTooltipProps {
  /** The type of tooltip - used to track dismissal state */
  tooltipType: TooltipType;
  /** CSS selector for the element to highlight */
  element: string;
  /** Tooltip title text */
  title: string;
  /** Tooltip description text (supports newlines) */
  description: string;
  /** Position of the tooltip relative to the element */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Whether the tooltip should be shown (e.g., when a dialog is open) */
  enabled?: boolean;
  /** Delay before showing tooltip in ms (default: 500) */
  delay?: number;
}

/** Delay before showing the tooltip after enabled becomes true */
const DEFAULT_TOOLTIP_DELAY = 500;

/**
 * ContextualTooltip component for showing one-time educational tooltips.
 *
 * Uses Driver.js to highlight a specific element and show a tooltip.
 * Tracks whether the user has seen each tooltip type and only shows once.
 *
 * @example
 * ```tsx
 * <ContextualTooltip
 *   tooltipType={TooltipType.TASK_DIALOG_SCHEDULED_DUE}
 *   element="[data-scheduled-date-field]"
 *   title="Scheduled vs Due Dates"
 *   description="SCHEDULED = When you'll work on it\nDUE = Hard deadline"
 *   side="right"
 *   enabled={isDialogOpen}
 * />
 * ```
 */
export function ContextualTooltip({
  tooltipType,
  element,
  title,
  description,
  side = 'bottom',
  enabled = true,
  delay = DEFAULT_TOOLTIP_DELAY,
}: ContextualTooltipProps) {
  const { hasSeenTooltip, dismissTooltip, isLoading, shouldShowTour } =
    useOnboarding();
  const driverRef = useRef<Driver | null>(null);
  const hasShownRef = useRef(false);

  /**
   * Handle tooltip dismissal.
   */
  const handleDismiss = useCallback(async () => {
    Sentry.addBreadcrumb({
      category: 'onboarding',
      message: `Dismissing contextual tooltip: ${tooltipType}`,
      level: 'info',
    });

    try {
      await dismissTooltip(tooltipType);
    } catch (error) {
      // Error already logged in dismissTooltip, just continue
      console.error('Failed to dismiss tooltip:', error);
    }
  }, [tooltipType, dismissTooltip]);

  useEffect(() => {
    // Don't show if still loading, not enabled, or already shown in this mount
    if (isLoading || !enabled || hasShownRef.current) {
      return;
    }

    // Don't show contextual tooltips until the initial tour is completed
    // This prevents tooltips from appearing before/during the onboarding tour
    if (shouldShowTour) {
      return;
    }

    // Check if user has already seen this tooltip
    if (hasSeenTooltip(tooltipType)) {
      return;
    }

    // Prevent showing again during this component lifecycle
    hasShownRef.current = true;

    Sentry.addBreadcrumb({
      category: 'onboarding',
      message: `Showing contextual tooltip: ${tooltipType}`,
      level: 'info',
      data: { element, title },
    });

    // Show tooltip after a delay to let the UI settle
    const timeoutId = setTimeout(() => {
      // Check if element exists in DOM
      const targetElement = document.querySelector(element);
      if (!targetElement) {
        Sentry.addBreadcrumb({
          category: 'onboarding',
          message: `Tooltip element not found: ${element}`,
          level: 'warning',
        });
        return;
      }

      driverRef.current = driver({
        showProgress: false,
        showButtons: ['close'],
        animate: true,
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        stagePadding: 8,
        allowClose: true,
        popoverClass: 'nowly-tour-popover',
        allowKeyboardControl: true,
        overlayClickBehavior: 'close',
        steps: [
          {
            element,
            popover: {
              title,
              description,
              side,
              align: 'center',
            },
          },
        ],
        onDestroyed: () => {
          handleDismiss();
        },
      });

      driverRef.current.drive();
    }, delay);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [
    isLoading,
    enabled,
    shouldShowTour,
    tooltipType,
    element,
    title,
    description,
    side,
    delay,
    hasSeenTooltip,
    handleDismiss,
  ]);

  // This component doesn't render anything visible
  return null;
}
