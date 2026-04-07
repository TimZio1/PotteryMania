"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  label?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function FilterCollapse({ label = "Filters", defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 shadow-sm md:hidden"
        aria-expanded={open}
      >
        <span>{label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className={cn("transition-transform", open && "rotate-180")}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={cn("md:block", open ? "block" : "hidden")}>
        {children}
      </div>
    </>
  );
}
