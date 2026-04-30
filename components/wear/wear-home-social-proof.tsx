/**
 * Honest “social proof” band: live catalog counts + factual checkout/shipping claims.
 * No invented reviewers or star ratings — only numbers from the DB and verifiable facts.
 */
export function WearHomeSocialProof({
  totalPieces,
  teeCount,
  hoodieCount,
  catalogOk,
}: {
  totalPieces: number;
  teeCount: number;
  hoodieCount: number;
  catalogOk: boolean;
}) {
  const hasInventory = catalogOk && totalPieces > 0;

  return (
    <section
      className="relative border-t border-(--heat)/35 bg-(--ink) text-(--clay)"
      aria-labelledby="home-social-proof-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(255,74,28,0.12),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="max-w-2xl">
          <p id="home-social-proof-heading" className="pm-caption text-(--heat)">
            Field notes
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-(--clay)/75 sm:text-base">
            Live counts from the catalog, checkout you can verify, shipping you can quote at cart — no
            stock headshots, no invented five-star blocks.
          </p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-3 sm:gap-5 lg:gap-6">
          <li className="rounded-xl border border-(--clay)/12 bg-(--clay)/4 px-5 py-6 sm:min-h-48">
            <p className="pm-caption text-(--heat)">Live inventory</p>
            {hasInventory ? (
              <>
                <p className="pm-display mt-3 text-[2.75rem] leading-none text-(--clay) sm:text-[3.25rem]">
                  {totalPieces}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-(--clay)/72">
                  Pieces in rotation right now — tees, hoodies, and the rest of the drop.
                </p>
                {teeCount > 0 || hoodieCount > 0 ? (
                  <p className="mt-3 text-xs leading-relaxed text-(--clay)/50">
                    {[
                      teeCount > 0 ? `${teeCount} tee${teeCount === 1 ? "" : "s"}` : null,
                      hoodieCount > 0 ? `${hoodieCount} hoodie${hoodieCount === 1 ? "" : "s"}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    .
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="pm-display mt-3 text-[2rem] leading-none text-(--clay)/90 sm:text-[2.25rem]">
                  On the way
                </p>
                <p className="mt-2 text-sm leading-relaxed text-(--clay)/72">
                  Catalog is reconnecting — counts will show here the moment the drop is live in the
                  database.
                </p>
              </>
            )}
          </li>

          <li className="rounded-xl border border-(--clay)/12 bg-(--clay)/4 px-5 py-6 sm:min-h-48">
            <p className="pm-caption text-(--heat)">Checkout</p>
            <p className="mt-3 text-lg font-semibold leading-snug tracking-tight text-(--clay) sm:text-xl">
              Stripe-backed checkout.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-(--clay)/72">
              Cards, Apple Pay, Google Pay, and Link — processed by Stripe. We never handle your card
              numbers on our servers.
            </p>
          </li>

          <li className="rounded-xl border border-(--clay)/12 bg-(--clay)/4 px-5 py-6 sm:min-h-48">
            <p className="pm-caption text-(--heat)">Fulfillment</p>
            <p className="mt-3 text-lg font-semibold leading-snug tracking-tight text-(--clay) sm:text-xl">
              Made to order. Shipped where you throw.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-(--clay)/72">
              Printed through a European production partner, packed for transit, and sent worldwide — rates
              and ETA at checkout for your address.
            </p>
          </li>
        </ul>

        <figure className="mt-12 border-t border-(--clay)/10 pt-10 text-center sm:mt-14 sm:pt-12">
          <blockquote className="mx-auto max-w-3xl font-serif text-xl italic leading-snug text-(--clay)/92 sm:text-2xl sm:leading-snug">
            We are not dressing a billboard brand. We are outfitting people who finish in glaze, not focus
            groups.
          </blockquote>
          <figcaption className="pm-caption mt-5 text-(--heat)">PotteryMania</figcaption>
        </figure>
      </div>
    </section>
  );
}
