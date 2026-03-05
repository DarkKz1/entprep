import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'mobile';
  const w = window.innerWidth;
  if (w >= BREAKPOINTS.desktop) return 'desktop';
  if (w >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    const mqTablet = window.matchMedia(`(min-width: ${BREAKPOINTS.tablet}px)`);
    const mqDesktop = window.matchMedia(`(min-width: ${BREAKPOINTS.desktop}px)`);

    const update = () => {
      if (mqDesktop.matches) setBp('desktop');
      else if (mqTablet.matches) setBp('tablet');
      else setBp('mobile');
    };

    mqTablet.addEventListener('change', update);
    mqDesktop.addEventListener('change', update);
    return () => {
      mqTablet.removeEventListener('change', update);
      mqDesktop.removeEventListener('change', update);
    };
  }, []);

  return bp;
}
