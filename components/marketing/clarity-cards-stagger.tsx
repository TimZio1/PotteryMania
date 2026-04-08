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
          className="rounded-[1.75rem] border border-(--brand-line) bg-white/80 p-7 shadow-[0_20px_60px_rgba(61,36,23,0.06)] backdrop-blur-sm"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-(--brand-soft) text-sm font-semibold text-(--brand-ink)">
            0{index + 1}
          </div>
          <h3 className="mt-5 font-serif text-2xl text-(--brand-ink)">{item.title}</h3>
          <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">{item.body}</p>
        </motion.article>
      ))}
    </motion.div>
  );
}
