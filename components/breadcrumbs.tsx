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
  /** `platform` = dashboard / admin chrome. `studio` = public studio & marketing paths. */
  visualMode?: VisualMode;
}) {
  if (items.length === 0) return null;

  const muted = visualMode === "platform" ? "text-stone-500" : "text-stone-500";
  const linkClass =
    visualMode === "platform"
      ? "font-medium text-stone-700 hover:text-amber-950 hover:underline"
      : "font-medium text-amber-900 hover:underline";
  const currentClass = visualMode === "platform" ? "font-medium text-stone-800" : "font-medium text-stone-700";
  const sepClass = visualMode === "platform" ? "text-stone-300" : "text-stone-300";

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
