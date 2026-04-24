import { useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import { noMotionVariants } from './presets';

const MOTION_KEY = 'motion-enabled';

function isMotionEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(MOTION_KEY);
  return stored !== 'false';
}

export function setMotionEnabled(enabled: boolean): void {
  localStorage.setItem(MOTION_KEY, String(enabled));
}

export function useMotion(variants: Variants): {
  variants: Variants;
  enabled: boolean;
  toggle: () => void;
} {
  const prefersReduced = useReducedMotion();
  const enabled = isMotionEnabled() && !prefersReduced;

  return {
    variants: enabled ? variants : noMotionVariants,
    enabled,
    toggle: () => setMotionEnabled(!isMotionEnabled()),
  };
}
