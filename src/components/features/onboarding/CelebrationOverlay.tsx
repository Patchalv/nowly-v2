'use client';

import { useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface CelebrationOverlayProps {
  /** Whether to show the celebration */
  show: boolean;
  /** Callback when celebration is complete */
  onComplete?: () => void;
  /** Duration of the celebration in ms (default: 4000) */
  duration?: number;
}

/** Duration for confetti bursts */
const CONFETTI_DURATION = 3000;
/** Duration for the entire celebration (including fade out) */
const DEFAULT_CELEBRATION_DURATION = 4000;

/**
 * Check if user prefers reduced motion.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * CelebrationOverlay component for showing fireworks and welcome message.
 *
 * Displays a full-screen overlay with confetti fireworks and a
 * "Welcome to Nowly" message when the onboarding tour completes.
 *
 * @example
 * ```tsx
 * <CelebrationOverlay
 *   show={showCelebration}
 *   onComplete={() => setShowCelebration(false)}
 * />
 * ```
 */
export function CelebrationOverlay({
  show,
  onComplete,
  duration = DEFAULT_CELEBRATION_DURATION,
}: CelebrationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  /**
   * Fire confetti from both sides like fireworks.
   * Returns a cleanup function to cancel ongoing animations.
   */
  const fireConfetti = useCallback(() => {
    // Skip confetti for users who prefer reduced motion
    if (prefersReducedMotion()) return;

    const end = Date.now() + CONFETTI_DURATION;

    // Color palette matching Nowly brand
    const colors = ['#8b5cf6', '#6366f1', '#ec4899', '#f97316', '#fbbf24'];

    const frame = () => {
      // Launch from left side
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        startVelocity: 45,
        gravity: 1,
        drift: 0,
        ticks: 200,
        scalar: 1.2,
      });

      // Launch from right side
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        startVelocity: 45,
        gravity: 1,
        drift: 0,
        ticks: 200,
        scalar: 1.2,
      });

      if (Date.now() < end) {
        rafIdRef.current = requestAnimationFrame(frame);
      }
    };

    // Initial burst from center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
      colors,
      startVelocity: 30,
      gravity: 0.8,
      scalar: 1.2,
    });

    // Start continuous fireworks from sides
    rafIdRef.current = requestAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!show) {
      hasStartedRef.current = false;
      return;
    }

    // Prevent multiple fires
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Start confetti immediately
    fireConfetti();

    // Start fade out animation before calling onComplete
    // Using direct style manipulation here to avoid lint issues with setState in effects
    // This is a one-time animation that doesn't need React's reconciliation
    const fadeOutTimer = setTimeout(() => {
      if (overlayRef.current) {
        overlayRef.current.style.opacity = '0';
      }
    }, duration - 500);

    // Complete after duration
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
      // Cancel any ongoing RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [show, duration, onComplete, fireConfetti]);

  if (!show) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-[99999] flex items-center justify-center',
        'bg-black/60 backdrop-blur-sm',
        'transition-opacity duration-500',
        // Respect reduced motion preferences
        'motion-reduce:transition-none'
      )}
      style={{ opacity: 1 }}
      role="status"
      aria-live="polite"
      aria-label="Welcome celebration"
    >
      <div
        className={cn(
          'text-center',
          'animate-in zoom-in-50 fade-in duration-500',
          'motion-reduce:animate-none'
        )}
      >
        <h1
          className={cn(
            'text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl',
            'bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400',
            'bg-clip-text text-transparent',
            'drop-shadow-lg'
          )}
        >
          Welcome to Nowly
        </h1>
        <p className="text-muted-foreground mt-4 text-lg sm:text-xl">
          Let&apos;s get things done!
        </p>
      </div>
    </div>
  );
}
