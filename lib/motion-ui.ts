import type { Transition, Variants } from "framer-motion";

/** Default transitions when motion is allowed (honour `useReducedMotion()` in components). */
export const motionEase = [0.22, 1, 0.36, 1] as const;

export function modalTransition(reducedMotion: boolean | null): Transition {
  if (reducedMotion) return { duration: 0 };
  return { duration: 0.22, ease: motionEase };
}

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.99 },
};

export const modalPanelVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export const staggerItemVariantsReduced: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};
