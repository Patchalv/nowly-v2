'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  driver,
  type DriveStep,
  type Driver,
  type Config,
  type State,
} from 'driver.js';
import 'driver.js/dist/driver.css';
import * as Sentry from '@sentry/nextjs';

import { useOnboarding } from '@/hooks/useOnboarding';
import { useSidebar } from '@/components/ui/sidebar';
import {
  TOUR_CONFIG,
  isMobile,
  isSidebarElement,
} from '@/lib/onboarding/tour-config';
import { getTourSteps } from '@/lib/onboarding/tour-steps';
import { CelebrationOverlay } from './CelebrationOverlay';

/** Delay before starting the tour (ms) */
const TOUR_START_DELAY = 2000;

/**
 * OnboardingTour component that manages the Driver.js product tour.
 *
 * Features:
 * - Automatically starts for new users who haven't completed the tour
 * - Adapts to mobile/desktop with different step sets
 * - Manages mobile sidebar state during tour steps
 * - Tracks completion in database
 *
 * @example
 * ```tsx
 * // Add to your protected layout
 * <OnboardingTour />
 * ```
 */
export function OnboardingTour() {
  const { shouldShowTour, completeTour, isLoading } = useOnboarding();
  const { setOpenMobile, isMobile: isMobileSidebar } = useSidebar();
  const driverRef = useRef<Driver | null>(null);
  const hasStartedRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(false);

  /**
   * Handle celebration completion - mark tour as done in database.
   */
  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    completeTour.mutate();
  }, [completeTour]);

  /**
   * Handle tour completion (either finished or closed early).
   */
  const handleTourComplete = useCallback(() => {
    Sentry.addBreadcrumb({
      category: 'onboarding',
      message: 'Tour completed or closed',
      level: 'info',
    });

    // Close mobile sidebar if open
    if (isMobileSidebar) {
      setOpenMobile(false);
    }

    // Show celebration overlay with fireworks
    setShowCelebration(true);
  }, [isMobileSidebar, setOpenMobile]);

  /**
   * Handle step changes to manage mobile sidebar visibility.
   */
  const handleStepChange = useCallback(
    (
      element: Element | undefined,
      step: DriveStep,
      opts: { config: Config; state: State; driver: Driver }
    ) => {
      const selector = step.element as string | undefined;
      const needsSidebar = isSidebarElement(selector);

      const stepIndex = opts.state.activeIndex ?? 0;

      Sentry.addBreadcrumb({
        category: 'onboarding',
        message: `Tour step ${stepIndex + 1}: ${step.popover?.title || 'Unknown'}`,
        level: 'info',
        data: {
          stepIndex,
          selector,
          needsSidebar,
        },
      });

      // On mobile, open/close sidebar based on step requirements
      if (isMobileSidebar) {
        setOpenMobile(needsSidebar);
      }
    },
    [isMobileSidebar, setOpenMobile]
  );

  useEffect(() => {
    // Don't start if still loading, shouldn't show tour, or already started
    if (isLoading || !shouldShowTour || hasStartedRef.current) {
      return;
    }

    // Prevent multiple starts
    hasStartedRef.current = true;

    Sentry.addBreadcrumb({
      category: 'onboarding',
      message: 'Starting onboarding tour',
      level: 'info',
      data: {
        isMobile: isMobile(),
        stepCount: getTourSteps(isMobile()).length,
      },
    });

    // Initialize driver with a delay to ensure UI is ready
    const timeoutId = setTimeout(() => {
      const steps = getTourSteps(isMobile());

      driverRef.current = driver({
        ...TOUR_CONFIG,
        steps,
        onHighlightStarted: handleStepChange,
        onDestroyed: handleTourComplete,
      });

      // Start the tour
      driverRef.current.drive();
    }, TOUR_START_DELAY);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [isLoading, shouldShowTour, handleStepChange, handleTourComplete]);

  // Render celebration overlay when tour completes
  return (
    <CelebrationOverlay
      show={showCelebration}
      onComplete={handleCelebrationComplete}
    />
  );
}
