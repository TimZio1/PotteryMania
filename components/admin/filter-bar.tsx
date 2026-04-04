import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-3 z-20 rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}
