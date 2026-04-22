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
      shopButton: buildButtonSnippet(shopUrl, "Shop pottery"),
      shopIframe: buildIframeSnippet(shopUrl, "Studio shop", 900),
      bookingsButton: buildButtonSnippet(bookingsUrl, "Book a class"),
      bookingsIframe: buildIframeSnippet(bookingsUrl, "Book a class", 960),
      resellerWidget: `<div id="potterymania-wearables" data-studio="${studioId}"></div>\n<script src="${resellerScriptUrl}" defer></script>`,
      resellerIframe: buildIframeSnippet(resellerFrameUrl, "Wearables shop", 420),
    };
  }, [origin, studioId]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className={ui.overline}>Add to your website</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Put PotteryMania on your own website</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Three ready-made ways to connect: your shop, your bookings, and your wearables reseller shop.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Shop and bookings work by linking to your studio page here. Wearables can be a widget or an iframe inside your site.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">1. Shop</p>
          <h2 className="mt-2 text-lg font-semibold text-stone-900">Sell your pottery from your site</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            A simple button, or your shop embedded straight into one of your pages.
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
          <h2 className="mt-2 text-lg font-semibold text-stone-900">Take class bookings from your site</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Send visitors straight into your upcoming classes, or show them on your page.
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
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">3. Wearables</p>
          <h2 className="mt-2 text-lg font-semibold text-stone-900">Sell your wearables shop on your site</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Drop your branded apparel shop into WordPress, Wix, Squarespace, or any HTML page.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/wearables`} className={ui.buttonPrimary}>
              Set up wearables
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
            <h2 className="text-lg font-semibold text-stone-900">Copy-paste snippets</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Pick the one that fits your website. A button for a quick link, an iframe to show the page inside yours, or a widget for wearables.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Shop</p>
            <CodeCard
              title="Button"
              description="The simplest option. Works on Shopify, WordPress, Squarespace, Wix, and any custom site."
              code={values.shopButton}
            />
            <CodeCard
              title="Iframe"
              description="Shows your shop right inside one of your pages."
              code={values.shopIframe}
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Bookings</p>
            <CodeCard
              title="Button"
              description="Takes visitors straight to your upcoming classes."
              code={values.bookingsButton}
            />
            <CodeCard
              title="Iframe"
              description="Shows your classes right inside one of your pages."
              code={values.bookingsIframe}
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Wearables</p>
            <CodeCard
              title="Widget (recommended)"
              description="Looks like part of your page. Best for most websites."
              code={values.resellerWidget}
            />
            <CodeCard
              title="Iframe"
              description="A quick fallback if your builder only allows iframes."
              code={values.resellerIframe}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
