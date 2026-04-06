import { cn } from "@/lib/cn";

/** Abstract “clay on the wheel” mark — stroke-only, uses currentColor, no background. */
export function PotteryManiaMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" y1="37" x2="44" y2="37" strokeWidth={2.35} />
        <path d="M7 37 Q24 11 41 37" />
        <path d="M11 37 Q24 16 37 37" />
        <path d="M15 37 Q24 21 33 37" />
      </g>
    </svg>
  );
}
