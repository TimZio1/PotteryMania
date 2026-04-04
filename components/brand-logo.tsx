"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { BRAND_LOGO_PUBLIC_PATH } from "@/lib/brand";

type Props = {
  className?: string;
  href?: string | null;
  priority?: boolean;
  /** Dark hero backgrounds: light frame so the cream logo reads clearly. */
  variant?: "default" | "on-dark";
  size?: "sm" | "md";
};

const sizeHeights: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-7",
  md: "h-8 sm:h-9",
};

export function BrandLogo({
  className,
  href = "/",
  priority,
  variant = "default",
  size = "md",
}: Props) {
  const img = (
    <Image
      src={BRAND_LOGO_PUBLIC_PATH}
      alt="PotteryMania"
      width={240}
      height={64}
      className={cn(sizeHeights[size], "w-auto")}
      priority={priority}
    />
  );

  const inner =
    variant === "on-dark" ? (
      <span className="inline-flex rounded-lg bg-white/95 p-1.5 shadow-md ring-1 ring-white/25">{img}</span>
    ) : (
      img
    );

  if (href === null) {
    return <span className={cn("inline-flex items-center", className)}>{inner}</span>;
  }

  return (
    <Link
      href={href}
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label="PotteryMania home"
    >
      {inner}
    </Link>
  );
}
