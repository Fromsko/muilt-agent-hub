import { motion, useReducedMotion } from 'motion/react';
import { staggerContainerVariants, staggerItemVariants, noMotionVariants } from './presets';
import type { ReactNode, CSSProperties } from 'react';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function AnimatedList({ children, className, style }: AnimatedListProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? noMotionVariants : staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function AnimatedListItem({ children, className, style }: AnimatedListItemProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? noMotionVariants : staggerItemVariants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
