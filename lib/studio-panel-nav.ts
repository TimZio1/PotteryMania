/** Studio Owner Panel — canonical paths under `/dashboard/[studioId]` (apparel partner surface). */

const b = (studioId: string, path: string) => `/dashboard/${studioId}${path}`;

export type StudioNavGroup = {
  id: string;
  label: string;
  items: { href: string; label: string }[];
};

/** Apparel / affiliate partner surface — no class booking or marketplace ceramics in this app. */
function apparelPartnerNavGroups(studioId: string): StudioNavGroup[] {
  return [
    {
      id: "overview",
      label: "Overview",
      items: [{ href: b(studioId, ""), label: "Home" }],
    },
    {
      id: "commerce",
      label: "Apparel",
      items: [
        { href: b(studioId, "/commerce/wearables"), label: "Partner & wear" },
        { href: b(studioId, "/commerce/orders"), label: "Orders" },
      ],
    },
    {
      id: "money",
      label: "Money",
      items: [
        { href: b(studioId, "/money/overview"), label: "Overview" },
        { href: b(studioId, "/money/payouts"), label: "Payouts & bank" },
      ],
    },
    {
      id: "site",
      label: "Website",
      items: [
        { href: b(studioId, "/site/page"), label: "Studio page" },
        { href: b(studioId, "/site/domains"), label: "Domain" },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      items: [
        { href: b(studioId, "/settings"), label: "Settings" },
        { href: b(studioId, "/guided"), label: "Simple setup" },
      ],
    },
  ];
}

/**
 * Primary navigation groups (sidebar) — apparel partner surface (studio SaaS discontinued).
 */
export function getStudioPanelNavGroups(studioId: string): StudioNavGroup[] {
  return apparelPartnerNavGroups(studioId);
}

/** Flat list for breadcrumb matching (longest href wins). */
export function getStudioPanelNavFlat(studioId: string): { href: string; label: string }[] {
  return getStudioPanelNavGroups(studioId).flatMap((g) => g.items);
}
