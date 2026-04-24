import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { fadeVariants, noMotionVariants } from './presets';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  routeKey: string;
  children: ReactNode;
}

export function PageTransition({ routeKey, children }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion ? noMotionVariants : fadeVariants;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
