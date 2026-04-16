import Image from "next/image";
import Link from "next/link";
import type { StudioWearItem } from "@/lib/studio-wear-catalog";

type Props = {
  studioId: string;
  items: StudioWearItem[];
};

function formatEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export function StudioWearSection({ studioId, items }: Props) {
  if (items.length === 0) return null;

  return (
    <section id="studio-wearables" className="st-section">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="st-muted text-xs uppercase tracking-wide">Wearables</p>
          <h2 className="st-h2 mt-1">Designed for makers</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/studios/${studioId}/wearables/${item.slug}`}
            className="st-tile group overflow-hidden"
          >
            <div className="relative aspect-square bg-stone-100">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-stone-400">No image</div>
              )}
            </div>
            <div className="p-3">
              <h3 className="st-h3 text-sm font-semibold line-clamp-1">{item.name}</h3>
              <p className="st-muted mt-1 text-[11px] uppercase tracking-wide">
                {item.categoryLabel}
                {item.topSubLabel ? ` · ${item.topSubLabel}` : ""}
              </p>
              {item.subtitle && <p className="st-muted mt-0.5 text-xs line-clamp-1">{item.subtitle}</p>}
              <p className="st-accent-text mt-1 text-sm font-semibold">{formatEur(item.priceCents)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
