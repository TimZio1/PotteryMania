import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-stone-200/70", className)} />;
}

export function SkeletonText({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={cn("h-3.5 animate-pulse rounded-md bg-stone-200/70", i === lines - 1 && "w-3/4")}
        />
      ))}
    </div>
  );
}
