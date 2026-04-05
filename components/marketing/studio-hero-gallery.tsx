"use client";

import { useCallback, useState } from "react";

type Props = {
  images: string[];
};

export function StudioHeroGallery({ images }: Props) {
  const safe = images.filter(Boolean);
  const [idx, setIdx] = useState(0);
  const n = safe.length;

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + n) % n);
  }, [n]);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % n);
  }, [n]);

  if (n === 0) {
    return (
      <div
        className="h-52 w-full bg-gradient-to-br from-amber-100 via-stone-100 to-amber-50 sm:h-72"
        aria-hidden
      />
    );
  }

  if (n === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={safe[0]} alt="" className="h-52 w-full object-cover sm:h-72" />
    );
  }

  return (
    <div className="relative h-52 w-full overflow-hidden bg-stone-900 sm:h-72">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={safe[idx]} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/55"
        aria-label="Previous photo"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/55"
        aria-label="Next photo"
      >
        ›
      </button>
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {safe.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Photo ${i + 1} of ${n}`}
            aria-current={i === idx}
            className={`h-2 rounded-full transition-[width] ${i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/70"}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}
