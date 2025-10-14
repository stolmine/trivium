export const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;

export const EASING = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
} as const;

export const viewTransitionConfig = {
  duration: ANIMATION_DURATION.normal,
  easing: EASING.standard,
  fadeInClass: 'animate-in fade-in',
  fadeOutClass: 'animate-out fade-out',
  slideInClass: 'slide-in-from-right-2',
  slideOutClass: 'slide-out-to-left-2',
} as const;

export const sidebarTransitionConfig = {
  duration: ANIMATION_DURATION.slow,
  easing: EASING.standard,
  property: 'width',
} as const;

export const SIDEBAR_WIDTH = {
  expanded: 256,
  collapsed: 64,
} as const;

export function getTransitionStyle(property: string, duration: number = ANIMATION_DURATION.normal, easing: string = EASING.standard) {
  return {
    transition: `${property} ${duration}ms ${easing}`,
  };
}

export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getAnimationClasses(baseClasses: string, animatedClasses: string): string {
  return shouldReduceMotion() ? baseClasses : `${baseClasses} ${animatedClasses}`;
}

export const MICRO_ANIMATIONS = {
  buttonHover: {
    scale: 1.02,
    transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  cardHover: {
    scale: 1.01,
    shadow: 'elevated',
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  linkHover: {
    opacity: 0.8,
    transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  focusRing: {
    outline: '2px solid',
    outlineOffset: '2px',
    transition: 'outline-offset 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export const PAGE_TRANSITIONS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
} as const;

export function getHoverStyles(type: 'button' | 'card' | 'link' = 'button') {
  if (shouldReduceMotion()) return {};

  switch (type) {
    case 'button':
      return {
        transform: 'scale(1.02)',
        transition: MICRO_ANIMATIONS.buttonHover.transition,
      };
    case 'card':
      return {
        transform: 'scale(1.01)',
        transition: MICRO_ANIMATIONS.cardHover.transition,
      };
    case 'link':
      return {
        opacity: 0.8,
        transition: MICRO_ANIMATIONS.linkHover.transition,
      };
    default:
      return {};
  }
}
