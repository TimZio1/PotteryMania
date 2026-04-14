"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  modalTransition,
  staggerContainerVariants,
  staggerItemVariants,
  staggerItemVariantsReduced,
} from "@/lib/motion-ui";

type Item = { title: string; body: string };

export function ClarityCardsStagger({ items }: { items: Item[] }) {
  const reduced = useReducedMotion();
  const itemVars = reduced ? staggerItemVariantsReduced : staggerItemVariants;
  const containerVars = reduced ? { hidden: {}, visible: {} } : staggerContainerVariants;

  return (
    <motion.div
      className="mt-12 grid gap-5 md:grid-cols-3"
      variants={containerVars}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
    >
      {items.map((item, index) => (
        <motion.article
          key={item.title}
          variants={itemVars}
          transition={modalTransition(reduced)}
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--pm-shadow-rest)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent-muted)] text-xs font-semibold tabular-nums text-[var(--accent)]">
            0{index + 1}
          </div>
          <h3 className="mt-5 font-serif text-xl font-normal tracking-[-0.01em] text-[var(--foreground)] sm:text-2xl">{item.title}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">{item.body}</p>
        </motion.article>
      ))}
    </motion.div>
  );
}
