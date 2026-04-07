import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-16 text-center", className)}>
      {icon ? <div className="mb-4 text-stone-400">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-amber-950">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
