import type { Config } from 'driver.js';

/**
 * Driver.js configuration for the onboarding tour.
 * Matches shadcn/ui design patterns.
 */
export const TOUR_CONFIG: Config = {
  // Show progress indicator (e.g., "1 of 10")
  showProgress: true,

  // Show navigation buttons
  showButtons: ['next', 'previous', 'close'],

  // Enable animations
  animate: true,

  // Overlay color (dark semi-transparent)
  overlayColor: 'rgba(0, 0, 0, 0.75)',

  // Smooth scroll to elements
  smoothScroll: true,

  // Allow clicking outside to close
  allowClose: true,

  // Padding around highlighted element
  stagePadding: 10,

  // Button text
  nextBtnText: 'Next →',
  prevBtnText: '← Back',
  doneBtnText: 'Get Started! 🎉',

  // Custom popover class for additional styling
  popoverClass: 'nowly-tour-popover',

  // Disable keyboard navigation during tour (can interfere with app shortcuts)
  allowKeyboardControl: true,

  // Overlay click behavior
  overlayClickBehavior: 'close',
};

/**
 * Check if the current viewport is mobile-sized.
 * Used to determine which tour steps to show.
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * Sidebar-related element selectors that require the mobile sidebar to be open.
 * Used to determine when to open/close the sidebar during the tour.
 */
export const SIDEBAR_SELECTORS = [
  '#sidebar-workspace-selector',
  '[href="/today"]',
  '[href="/daily"]',
  '[href="/weekly"]',
  '[href="/all-tasks"]',
  '[href="/backlog"]',
  '[href="/recurring"]',
];

/**
 * Check if an element selector targets a sidebar element.
 */
export function isSidebarElement(selector: string | undefined): boolean {
  if (!selector) return false;
  return SIDEBAR_SELECTORS.some(
    (s) => selector.includes(s) || s.includes(selector)
  );
}
