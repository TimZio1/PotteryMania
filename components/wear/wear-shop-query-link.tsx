"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, type ComponentProps, type MouseEvent } from "react";

type WearShopQueryLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/**
 * Filter chips on `/wear/shop` only change the query string. We still intercept
 * plain left-clicks and call `router.push` so SPA navigation stays predictable on
 * the wear shell.
 *
 * **Do not** chain `router.refresh()` after `router.push` here — on Next.js 15.5+
 * that combination has been observed to leave the page stuck in a perpetual
 * loading state (double RSC invalidation / transition starvation). A single
 * `router.push` is enough to load the new `searchParams` on the server.
 *
 * Avoid wrapping `router.push` in `startTransition`; soft navigations are
 * already async and deprioritizing them made filter taps feel like they “never
 * finish” under load.
 */
export function WearShopQueryLink({ href, scroll = false, onClick, prefetch = true, ...rest }: WearShopQueryLinkProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const targetAttr = e.currentTarget.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return;

      e.preventDefault();
      router.push(href, { scroll });
    },
    [href, onClick, router, scroll],
  );

  return <Link href={href} scroll={scroll} prefetch={prefetch} onClick={handleClick} {...rest} />;
}
