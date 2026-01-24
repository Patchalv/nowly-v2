'use client';

import { useCallback, useRef, useEffect } from 'react';
import { driver, type DriveStep, type Driver } from 'driver.js';
import { PlayCircle } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import {
  TOUR_CONFIG,
  isMobile,
  isSidebarElement,
} from '@/lib/onboarding/tour-config';
import { getTourSteps } from '@/lib/onboarding/tour-steps';

/**
 * Button component to replay the onboarding tour.
 *
 * Useful for users who want to refresh their knowledge
 * of the app's features after completing the initial tour.
 *
 * @example
 * ```tsx
 * <ReplayTourButton />
 * ```
 */
export function ReplayTourButton() {
  const { setOpenMobile, isMobile: isMobileSidebar } = useSidebar();
  const driverRef = useRef<Driver | null>(null);

  /**
   * Handle step changes to manage mobile sidebar visibility.
   */
  const handleStepChange = useCallback(
    (_element: Element | undefined, step: DriveStep) => {
      const selector = step.element as string | undefined;
      const needsSidebar = isSidebarElement(selector);

      // On mobile, open/close sidebar based on step requirements
      if (isMobileSidebar) {
        setOpenMobile(needsSidebar);
      }
    },
    [isMobileSidebar, setOpenMobile]
  );

  /**
   * Handle tour completion.
   */
  const handleTourComplete = useCallback(() => {
    // Close mobile sidebar if open
    if (isMobileSidebar) {
      setOpenMobile(false);
    }
  }, [isMobileSidebar, setOpenMobile]);

  // Cleanup driver instance on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, []);

  /**
   * Start the tour when button is clicked.
   */
  const handleReplayTour = useCallback(() => {
    Sentry.addBreadcrumb({
      category: 'onboarding',
      message: 'Replaying onboarding tour',
      level: 'info',
      data: {
        isMobile: isMobile(),
        stepCount: getTourSteps(isMobile()).length,
      },
    });

    try {
      const steps = getTourSteps(isMobile());

      // Clean up any existing driver instance
      if (driverRef.current) {
        driverRef.current.destroy();
      }

      driverRef.current = driver({
        ...TOUR_CONFIG,
        steps,
        onHighlightStarted: handleStepChange,
        onDestroyed: handleTourComplete,
      });

      // Start the tour
      driverRef.current.drive();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: 'onboarding', action: 'replay_tour' },
      });
      toast.error('Failed to start tour', {
        description: 'Please try again or refresh the page.',
      });
    }
  }, [handleStepChange, handleTourComplete]);

  return (
    <Button variant="outline" onClick={handleReplayTour}>
      <PlayCircle className="mr-2 h-4 w-4" />
      Replay Tour
    </Button>
  );
}
