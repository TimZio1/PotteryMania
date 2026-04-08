"use client";

import { motion, useReducedMotion } from "framer-motion";
import { modalTransition } from "@/lib/motion-ui";

export function MarketingPageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={modalTransition(reduced)}
    >
      {children}
    </motion.div>
  );
}
