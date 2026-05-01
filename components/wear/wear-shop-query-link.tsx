"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, type ComponentProps, type MouseEvent } from "react";

type WearShopQueryLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/**
 * Filter chips on `/wear/shop` only change the query string. In some Next.js 15
 * production builds, default `<Link>` handling does not reliably refresh the
 * server tree for same-pathname navigations. `router.push` + `router.refresh()`
 * forces the URL and RSC output to stay in sync.
 */
export function WearShopQueryLink({ href, scroll = false, onClick, prefetch = false, ...rest }: WearShopQueryLinkProps) {
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
      startTransition(() => {
        router.push(href, { scroll });
        router.refresh();
      });
    },
    [href, onClick, router, scroll],
  );

  return <Link href={href} scroll={scroll} prefetch={prefetch} onClick={handleClick} {...rest} />;
}
