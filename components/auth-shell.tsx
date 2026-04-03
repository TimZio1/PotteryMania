import Link from "next/link";
import type { ReactNode } from "react";
import { ui } from "@/lib/ui-styles";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: Props) {
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 sm:px-6 sm:py-16">
      <div className={ui.narrowContainer}>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-amber-900 transition hover:text-amber-950"
        >
          ← Back to PotteryMania
        </Link>
        <div className={`${ui.card} mt-8`}>
          <h1 className="text-2xl font-semibold tracking-tight text-amber-950">{title}</h1>
          {description ? <p className="mt-2 text-sm text-stone-600">{description}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
