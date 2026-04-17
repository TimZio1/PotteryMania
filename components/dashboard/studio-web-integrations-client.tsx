"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          /* ignore clipboard failures */
        }
      }}
      className="absolute right-2 top-2 rounded-md bg-white px-2 py-1 text-xs font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeCard({
  title,
  description,
  code,
}: {
  title: string;
  description: string;
  code: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
      <div className="relative mt-3">
        <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs leading-relaxed text-stone-700 ring-1 ring-stone-200">
{code}
        </pre>
        <CopyButton value={code} />
      </div>
    </div>
  );
}

function buildButtonSnippet(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1c1917;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">${label}</a>`;
}

function buildIframeSnippet(url: string, title: string, minHeight: number) {
  return `<iframe src="${url}" style="width:100%;min-height:${minHeight}px;border:none;" title="${title}" loading="lazy"></iframe>`;
}

export function StudioWebIntegrationsClient({ studioId }: { studioId: string }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const values = useMemo(() => {
    const base = origin || "";
    const studioUrl = `${base}/studios/${studioId}`;
    const shopUrl = `${studioUrl}#studio-shop`;
    const bookingsUrl = `${studioUrl}#upcoming-sessions`;
    const resellerFrameUrl = `${base}/embed/${studioId}/wearables`;
    const resellerScriptUrl = `${base}/embed/wearables.js`;

    return {
      shopUrl,
      bookingsUrl,
      resellerFrameUrl,
      shopButton: buildButtonSnippet(shopUrl, "Shop ceramics"),
      shopIframe: buildIframeSnippet(shopUrl, "Studio shop", 900),
      bookingsButton: buildButtonSnippet(bookingsUrl, "Book a class"),
      bookingsIframe: buildIframeSnippet(bookingsUrl, "Studio bookings", 960),
      resellerWidget: `<div id="potterymania-wearables" data-studio="${studioId}"></div>\n<script src="${resellerScriptUrl}" defer></script>`,
      resellerIframe: buildIframeSnippet(resellerFrameUrl, "Wearables shop", 420),
    };
  }, [origin, studioId]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className={ui.overline}>Shortlists</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Web page integration shortlists</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          One place for the three website integration paths you asked for: shop, bookings, and e shop reseller.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Shop and bookings currently integrate best through your hosted PotteryMania pages. E shop reseller supports both a JavaScript widget and an iframe embed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">1. Shop</p>
          <h2 className="mt-2 text-lg font-semibold text-stone-900">Sell ceramics from your site</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Best when you want a clean button or an embedded hosted shop section on your own website.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a href={values.shopUrl || `/studios/${studioId}#studio-shop`} target="_blank" rel="noreferrer" className={ui.buttonPrimary}>
              Open shop page
            </a>
            <Link href={`/dashboard/${studioId}/commerce/catalog`} className={ui.buttonSecondary}>
              Manage catalog
            </Link>
          </div>
        </section>

        <section className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">2. Bookings</p>
          <h2 className="mt-2 text-lg font-semibold text-stone-900">Send visitors into live class booking</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Best when your external site needs a direct way into your upcoming sessions and bookable classes.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a href={values.bookingsUrl || `/studios/${studioId}#upcoming-sessions`} target="_blank" rel="noreferrer" className={ui.buttonPrimary}>
              Open bookings page
            </a>
            <Link href={`/dashboard/${studioId}/schedule/sessions`} className={ui.buttonSecondary}>
              Manage bookings
            </Link>
          </div>
        </section>

        <section className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">3. E shop reseller</p>
          <h2 className="mt-2 text-lg font-semibold text-stone-900">Embed your reseller wear shop</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Best when you want a real embedded storefront for branded apparel on WordPress, Wix, Squarespace, or any HTML site.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/wearables`} className={ui.buttonPrimary}>
              Open reseller setup
            </Link>
            <a href={values.resellerFrameUrl || `/embed/${studioId}/wearables`} target="_blank" rel="noreferrer" className={ui.buttonSecondary}>
              Preview embed
            </a>
          </div>
        </section>
      </div>

      <section className={ui.card}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Website snippets</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Copy the version that fits your website builder. Keep it simple: button link for fast setup, iframe if you want the PotteryMania page inside your site, reseller widget for the full e shop integration.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Shop</p>
            <CodeCard
              title="Hosted button"
              description="Best default for Shopify, WordPress, Squarespace, Wix, or any custom site."
              code={values.shopButton}
            />
            <CodeCard
              title="Hosted iframe"
              description="Embeds your public studio shop section inside another page."
              code={values.shopIframe}
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Bookings</p>
            <CodeCard
              title="Booking button"
              description="Sends visitors straight to your upcoming sessions section."
              code={values.bookingsButton}
            />
            <CodeCard
              title="Booking iframe"
              description="Embeds your hosted booking area inside another page."
              code={values.bookingsIframe}
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">E shop reseller</p>
            <CodeCard
              title="Widget"
              description="Recommended. Inline reseller storefront that feels native to your page."
              code={values.resellerWidget}
            />
            <CodeCard
              title="Iframe"
              description="Fastest fallback if your builder prefers iframe blocks."
              code={values.resellerIframe}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
