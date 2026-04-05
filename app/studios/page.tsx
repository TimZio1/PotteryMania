import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { redirectEndUserIfNoApprovedStudios } from "@/lib/public-catalog-guard";
import {
  GEO_SCAN_LIMIT,
  buildStudioDiscoverWhere,
  buildStudiosSearchString,
  filterRowsByNearKm,
  parseStudiosSearchParams,
} from "@/lib/public-discovery";
import { haversineKm } from "@/lib/geo";
import { cn } from "@/lib/cn";
import { NearPointFields } from "@/components/discovery/near-point-fields";
import { NearResultsMap } from "@/components/discovery/near-results-map";
import { sortStudiosByMarketplaceRanking } from "@/lib/ranking/score-engine";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function hasActiveStudioFilters(sp: Record<string, string | string[] | undefined>): boolean {
  const keys = ["q", "country", "city", "offer"];
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

export default async function StudiosPage({ searchParams }: Props) {
  const session = await auth();
  await redirectEndUserIfNoApprovedStudios(session?.user?.role);
  const raw = (await searchParams) ?? {};
  const sortRaw = typeof raw.sort === "string" ? raw.sort : "";
  const byName = sortRaw === "name";
  const filters = parseStudiosSearchParams(raw);
  const filtered = hasActiveStudioFilters(raw);
  const where = buildStudioDiscoverWhere(filters);
  const near = filters.near;

  let studios = await prisma.studio.findMany({
    where,
    orderBy: byName ? { displayName: "asc" } : [{ marketplaceRankWeight: "desc" }, { displayName: "asc" }],
    include: { rankingScore: { select: { compositeScore: true } } },
    ...(near ? { take: GEO_SCAN_LIMIT } : {}),
  });

  if (near) {
    studios = filterRowsByNearKm(studios, near, (s) =>
      s.latitude != null && s.longitude != null ? { lat: s.latitude, lng: s.longitude } : null,
    );
  } else if (!byName) {
    studios = sortStudiosByMarketplaceRanking(studios);
  }

  const hrefRecommended = (() => {
    const q = buildStudiosSearchString(filters, undefined);
    return q ? `/studios?${q}` : "/studios";
  })();
  const hrefName = (() => {
    const q = buildStudiosSearchString(filters, "name");
    return q ? `/studios?${q}` : "/studios?sort=name";
  })();

  const latDefault = near ? String(near.lat) : "";
  const lngDefault = near ? String(near.lng) : "";
  const radiusDefault = near ? String(near.radiusKm) : "";

  const studioMapMarkers = near
    ? studios
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s.id,
          lat: s.latitude as number,
          lng: s.longitude as number,
          title: s.displayName,
          href: `/studios/${s.id}`,
        }))
    : [];

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="max-w-2xl">
          <p className={ui.overline}>Studios</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">Independent makers</h1>
          <p className="mt-3 text-stone-600">
            Every studio here is verified. Open a profile to see classes and products in one place. Order defaults to
            platform ranking; switch to A–Z if you prefer.
          </p>
        </div>

        <form method="get" action="/studios" className={`${ui.cardMuted} mt-8 space-y-4`}>
          {byName ? <input type="hidden" name="sort" value="name" /> : null}
          <p className="text-sm font-medium text-stone-800">Filter studios</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={ui.label} htmlFor="studios-q">
                Search
              </label>
              <input
                id="studios-q"
                name="q"
                type="search"
                placeholder="Name, city, or description"
                defaultValue={filters.q}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="studios-country">
                Country
              </label>
              <input
                id="studios-country"
                name="country"
                type="text"
                autoComplete="country-name"
                defaultValue={filters.country}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="studios-city">
                City
              </label>
              <input
                id="studios-city"
                name="city"
                type="text"
                defaultValue={filters.city}
                className={`${ui.input} mt-1.5`}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-800">
                <input
                  type="checkbox"
                  name="offer"
                  value="classes"
                  defaultChecked={filters.hasPublicClasses}
                  className="h-4 w-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900/25"
                />
                Has public classes
              </label>
            </div>
            <NearPointFields
              idPrefix="studios"
              initialLat={latDefault}
              initialLng={lngDefault}
              initialRadius={radiusDefault}
              description={
                <>
                  Studios need latitude/longitude on their profile. Use the button to fill from your device, or paste
                  from a map. We scan up to {GEO_SCAN_LIMIT} studios, filter by radius, then sort nearest first.
                </>
              }
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={ui.buttonPrimary}>
              Apply filters
            </button>
            {filtered ? (
              <Link
                href={byName ? "/studios?sort=name" : "/studios"}
                className={cn(ui.buttonSecondary, "inline-flex items-center justify-center")}
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-stone-500">Sort</span>
          <Link
            href={hrefRecommended}
            className={cn(
              ui.buttonSecondary,
              "min-h-9 px-3 py-1.5 text-xs",
              !byName ? "border-amber-400/50 bg-amber-50" : "",
            )}
          >
            Recommended
          </Link>
          <Link
            href={hrefName}
            className={cn(
              ui.buttonSecondary,
              "min-h-9 px-3 py-1.5 text-xs",
              byName ? "border-amber-400/50 bg-amber-50" : "",
            )}
          >
            Name A–Z
          </Link>
        </div>

        {near ? (
          <section className="mt-10" aria-labelledby="studios-map-heading">
            <h2 id="studios-map-heading" className="text-lg font-semibold text-amber-950">
              Map
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Amber circle: your search radius. Pins match the list below — click a pin to open the studio.
            </p>
            <div className="mt-4">
              <NearResultsMap
                centerLat={near.lat}
                centerLng={near.lng}
                radiusKm={near.radiusKm}
                markers={studioMapMarkers}
              />
            </div>
          </section>
        ) : null}

        {studios.length === 0 ? (
          filtered ? (
            <div className={`${ui.cardMuted} mt-10 max-w-lg`}>
              <p className="font-medium text-stone-800">No studios match these filters</p>
              <p className="mt-2 text-sm text-stone-600">
                Try clearing filters or visit the{" "}
                <Link href="/classes" className="font-medium text-amber-900 underline underline-offset-2">
                  classes
                </Link>{" "}
                page.
              </p>
              <Link
                href={byName ? "/studios?sort=name" : "/studios"}
                className={`${ui.buttonSecondary} mt-4 inline-flex`}
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <p className="mt-10 text-stone-500">No approved studios yet.</p>
          )
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {studios.map((studio) => {
              const km =
                near && studio.latitude != null && studio.longitude != null
                  ? haversineKm(near.lat, near.lng, studio.latitude, studio.longitude)
                  : null;
              return (
              <Link
                key={studio.id}
                href={`/studios/${studio.id}`}
                className={`${ui.tile} flex flex-col p-5 sm:p-6`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-stone-900">{studio.displayName}</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      {studio.city}, {studio.country}
                    </p>
                    {km != null ? <p className="mt-1 text-xs text-stone-500">~{km.toFixed(1)} km away</p> : null}
                  </div>
                  {studio.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={studio.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-stone-100" />
                  ) : null}
                </div>
                {studio.shortDescription ? (
                  <p className="mt-4 line-clamp-3 text-sm text-stone-600">{studio.shortDescription}</p>
                ) : null}
              </Link>
            );
            })}
          </div>
        )}
      </main>
    </MarketingLayout>
  );
}
