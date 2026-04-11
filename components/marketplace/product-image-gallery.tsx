"use client";

import { useMemo, useState } from "react";

type ProductGalleryImage = {
  id: string;
  url: string;
  alt: string;
};

export function ProductImageGallery({
  images,
  title,
}: {
  images: ProductGalleryImage[];
  title: string;
}) {
  const normalized = useMemo(() => images.filter((image) => image.url.trim() !== ""), [images]);
  const [selectedId, setSelectedId] = useState(normalized[0]?.id ?? "");
  const selected = normalized.find((image) => image.id === selectedId) ?? normalized[0] ?? null;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-100 shadow-sm">
        {selected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.url} alt={selected.alt || title} className="aspect-square w-full object-cover" />
        ) : (
          <div className="flex aspect-square items-center justify-center text-stone-400">No image</div>
        )}
      </div>

      {normalized.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {normalized.map((image, index) => {
            const isActive = image.id === selected?.id;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelectedId(image.id)}
                aria-pressed={isActive}
                aria-label={`Show ${title} image ${index + 1}`}
                className={`overflow-hidden rounded-lg ring-1 transition ${
                  isActive
                    ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-white"
                    : "ring-stone-200 hover:ring-amber-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt || `${title} detail view`} className="h-16 w-16 object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
