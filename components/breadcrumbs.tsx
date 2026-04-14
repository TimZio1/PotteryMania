import Link from "next/link";
import type { VisualMode } from "@/lib/visual-mode";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className = "",
  visualMode = "studio",
}: {
  items: BreadcrumbItem[];
  className?: string;
  visualMode?: VisualMode;
}) {
  if (items.length === 0) return null;

  const muted = "text-[var(--muted)]";
  const linkClass =
    visualMode === "platform"
      ? "font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:underline"
      : "font-medium text-[var(--accent)] hover:underline";
  const currentClass = "font-medium text-[var(--foreground)]";
  const sepClass = "text-[var(--border)]";

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${muted}`}>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
              {item.href && !isCurrent ? (
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} className={isCurrent ? currentClass : ""}>
                  {item.label}
                </span>
              )}
              {!isCurrent ? (
                <span aria-hidden="true" className={sepClass}>
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
