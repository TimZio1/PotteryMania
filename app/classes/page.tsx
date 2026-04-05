import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { redirectEndUserIfNoPublicClasses } from "@/lib/public-catalog-guard";
import {
  DISCOVER_EXPERIENCE_TYPE_OPTIONS,
  GEO_SCAN_LIMIT,
  buildExperienceDiscoverWhere,
  experienceMeetingPoint,
  filterRowsByNearKm,
  parseClassesSearchParams,
} from "@/lib/public-discovery";
import { haversineKm } from "@/lib/geo";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/cn";
import { NearPointFields } from "@/components/discovery/near-point-fields";
import { NearResultsMap } from "@/components/discovery/near-results-map";
import { sortExperiencesByMarketplaceRanking } from "@/lib/ranking/score-engine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildMetadata({
  title: "Classes and experiences",
  description: "Book pottery classes, workshops, and ceramic studio experiences.",
  path: "/classes",
});

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function hasActiveClassFilters(sp: Record<string, string | string[] | undefined>): boolean {
  const keys = ["q", "country", "city", "category", "skill", "type", "minPrice", "maxPrice", "from", "to", "spots"];
  if (
    keys.some((k) => {
      const v = sp[k];
      return typeof v === "string" && v.trim() !== "";
    })
  ) {
    return true;
  }
  const lat = typeof sp.lat === "string" ? sp.lat.trim() : "";
  const lng = typeof sp.lng === "string" ? sp.lng.trim() : "";
  return Boolean(lat && lng);
}

export default async function ClassesPage({ searchParams }: Props) {
  const session = await auth();
  await redirectEndUserIfNoPublicClasses(session?.user?.role);
  const raw = (await searchParams) ?? {};
  const filters = parseClassesSearchParams(raw);
  const filtered = hasActiveClassFilters(raw);
  const where = buildExperienceDiscoverWhere(filters);
  const near = filters.near;

  let experiences = await prisma.experience.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: near ? GEO_SCAN_LIMIT : 80,
    include: {
      studio: {
        select: {
          displayName: true,
          city: true,
          country: true,
          latitude: true,
          longitude: true,
          marketplaceRankWeight: true,
          rankingScore: { select: { compositeScore: true } },
        },
      },
      images: { where: { isPrimary: true }, take: 1 },
    },
  });

  if (near) {
    experiences = filterRowsByNearKm(experiences, near, (ex) => experienceMeetingPoint(ex)).slice(0, 80);
  } else {
    experiences = sortExperiencesByMarketplaceRanking(experiences);
  }

  const minPriceDefault =
    filters.minPriceCents != null ? String(filters.minPriceCents / 100) : "";
  const maxPriceDefault =
    filters.maxPriceCents != null ? String(filters.maxPriceCents / 100) : "";
  const dateFromDefault = /^\d{4}-\d{2}-\d{2}$/.test(filters.slotFrom ?? "") ? filters.slotFrom : "";
  const dateToDefault = /^\d{4}-\d{2}-\d{2}$/.test(filters.slotTo ?? "") ? filters.slotTo : "";
  const latDefault = near ? String(near.lat) : "";
  const lngDefault = near ? String(near.lng) : "";
  const radiusDefault = near ? String(near.radiusKm) : "";

  const classMapMarkers = near
    ? experiences
        .flatMap((ex) => {
          const p = experienceMeetingPoint(ex);
          if (!p) return [];
          return [
            {
              id: ex.id,
              lat: p.lat,
              lng: p.lng,
              title: ex.title,
              href: `/classes/${ex.id}`,
            },
          ];
        })
    : [];

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="max-w-2xl">
          <p className={ui.overline}>Book</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">
            Classes &amp; experiences
          </h1>
          <p className="mt-3 text-stone-600">
            Pick a session at a studio. Pricing is per person; deposits and policies are shown before you pay.
          </p>
        </div>

        <form
          method="get"
          action="/classes"
          className={`${ui.cardMuted} mt-8 space-y-5`}
        >
          <p className="text-sm font-medium text-stone-800">Filter classes</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={ui.label} htmlFor="classes-q">
                Search
              </label>
              <input
                id="classes-q"
                name="q"
                type="search"
                placeholder="Title or description"
                defaultValue={filters.q}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-country">
                Country
              </label>
              <input
                id="classes-country"
                name="country"
                type="text"
                autoComplete="country-name"
                defaultValue={filters.country}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-city">
                City
              </label>
              <input
                id="classes-city"
                name="city"
                type="text"
                defaultValue={filters.city}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-category">
                Category
              </label>
              <input
                id="classes-category"
                name="category"
                type="text"
                defaultValue={filters.category}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-skill">
                Skill level
              </label>
              <input
                id="classes-skill"
                name="skill"
                type="text"
                placeholder="e.g. Beginner"
                defaultValue={filters.skillLevel}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-type">
                Type
              </label>
              <select
                id="classes-type"
                name="type"
                defaultValue={filters.experienceType || ""}
                className={`${ui.input} mt-1.5`}
              >
                <option value="">Any</option>
                {DISCOVER_EXPERIENCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-minPrice">
                Min price (€)
              </label>
              <input
                id="classes-minPrice"
                name="minPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={minPriceDefault}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-maxPrice">
                Max price (€)
              </label>
              <input
                id="classes-maxPrice"
                name="maxPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={maxPriceDefault}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-from">
                From date
              </label>
              <input
                id="classes-from"
                name="from"
                type="date"
                defaultValue={dateFromDefault}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="classes-to">
                To date
              </label>
              <input
                id="classes-to"
                name="to"
                type="date"
                defaultValue={dateToDefault}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-800">
                <input
                  type="checkbox"
                  name="spots"
                  value="open"
                  defaultChecked={filters.openSpotsOnly}
                  className="h-4 w-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900/25"
                />
                Only show dates with open spots
              </label>
            </div>
            <NearPointFields
              idPrefix="classes"
              initialLat={latDefault}
              initialLng={lngDefault}
              initialRadius={radiusDefault}
              description={
                <>
                  Decimal latitude &amp; longitude (WGS84). Use the button to fill from your device, or paste from a map.
                  We scan up to {GEO_SCAN_LIMIT} classes, keep those within the radius, and sort by distance. Coordinates
                  come from the class venue or the studio pin.
                </>
              }
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={ui.buttonPrimary}>
              Apply filters
            </button>
            {filtered ? (
              <Link href="/classes" className={cn(ui.buttonSecondary, "items-center")}>
                Clear
              </Link>
            ) : null}
          </div>
          <p className={ui.helper}>
            Filters update the URL so you can share a search. Dates use scheduled session days; open spots means the
            slot is bookable today or later. Leave latitude/longitude empty to search everywhere.
          </p>
        </form>

        {near ? (
          <section className="mt-10" aria-labelledby="classes-map-heading">
            <h2 id="classes-map-heading" className="text-lg font-semibold text-amber-950">
              Map
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Amber circle: your search radius. Pins match the list below — click a pin to open the class.
            </p>
            <div className="mt-4">
              <NearResultsMap
                centerLat={near.lat}
                centerLng={near.lng}
                radiusKm={near.radiusKm}
                markers={classMapMarkers}
              />
            </div>
          </section>
        ) : null}

        {experiences.length === 0 ? (
          <div className={`${ui.cardMuted} mt-10 max-w-lg`}>
            {filtered ? (
              <>
                <p className="font-medium text-stone-800">No classes match these filters</p>
                <p className="mt-2 text-sm text-stone-600">
                  Try clearing filters or browse{" "}
                  <Link href="/studios" className="font-medium text-amber-900 underline underline-offset-2">
                    studios
                  </Link>{" "}
                  and the{" "}
                  <Link href="/marketplace" className="font-medium text-amber-900 underline underline-offset-2">
                    marketplace
                  </Link>
                  .
                </p>
                <Link
                  href="/classes"
                  className={`${ui.buttonSecondary} mt-4 inline-flex`}
                >
                  Clear filters
                </Link>
              </>
            ) : (
              <>
                <p className="font-medium text-stone-800">No public classes yet</p>
                <p className="mt-2 text-sm text-stone-600">
                  Explore{" "}
                  <Link href="/studios" className="font-medium text-amber-900 underline underline-offset-2">
                    studios
                  </Link>{" "}
                  or the{" "}
                  <Link href="/marketplace" className="font-medium text-amber-900 underline underline-offset-2">
                    marketplace
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((ex) => {
              const img = ex.images[0]?.imageUrl;
              const price = ex.priceCents / 100;
              const pt = experienceMeetingPoint(ex);
              const km =
                near && pt ? haversineKm(near.lat, near.lng, pt.lat, pt.lng) : null;
              return (
                <Link key={ex.id} href={`/classes/${ex.id}`} className={ui.tile}>
                  <div className="aspect-video bg-stone-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-stone-400">No image</div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-xs font-medium text-stone-500">{ex.studio.displayName}</p>
                    <h2 className="mt-1 text-base font-semibold text-stone-900">{ex.title}</h2>
                    {km != null ? (
                      <p className="mt-1 text-xs text-stone-500">~{km.toFixed(1)} km away</p>
                    ) : null}
                    <p className="mt-2 text-sm font-medium text-amber-950">From €{price.toFixed(2)} / person</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </MarketingLayout>
  );
}
