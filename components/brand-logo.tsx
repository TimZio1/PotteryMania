import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { PotteryManiaMark } from "@/components/pottery-mania-mark";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  href?: string | null;
  /** Dark hero backgrounds: light strokes and type (no box behind the logo). */
  variant?: "default" | "on-dark";
  size?: "sm" | "md" | "lg";
};

const markSizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7 sm:h-8 sm:w-8",
  lg: "h-10 w-10 sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem]",
};

const wordSizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-base leading-none",
  md: "text-lg leading-none sm:text-xl",
  lg: "text-[1.65rem] leading-none sm:text-4xl md:text-[2.65rem] md:tracking-tight",
};

export function BrandLogo({
  className,
  href = "/",
  variant = "default",
  size = "md",
}: Props) {
  const inner = (
    <span className="inline-flex items-center gap-2 sm:gap-2.5">
      <PotteryManiaMark className={markSizes[size]} />
      <span className={cn("font-serif tracking-tight", wordSizes[size])}>PotteryMania</span>
    </span>
  );

  const colorClass =
    variant === "on-dark" ? "text-stone-50" : "text-(--brand-ink)";

  if (href === null) {
    return (
      <span className={twMerge("inline-flex items-center", colorClass, className)}>
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={twMerge("inline-flex shrink-0 items-center", colorClass, className)}
      aria-label="PotteryMania home"
    >
      {inner}
    </Link>
  );
}
