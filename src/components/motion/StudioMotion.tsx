'use client';

import React from 'react';
import { MotionConfig, motion } from 'framer-motion';

export const STUDIO_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.8,
};

export const GENTLE_SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 0.9,
};

export const SILK_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function StudioMotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function StudioFadeCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: SILK_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
