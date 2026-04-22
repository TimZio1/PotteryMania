/** Studio Owner Panel — canonical paths under `/dashboard/[studioId]`. */

const b = (studioId: string, path: string) => `/dashboard/${studioId}${path}`;

export type StudioNavGroup = {
  id: string;
  label: string;
  items: { href: string; label: string }[];
};

/**
 * Primary navigation groups (sidebar). All hrefs are canonical; legacy URLs redirect here.
 */
export function getStudioPanelNavGroups(studioId: string): StudioNavGroup[] {
  return [
    {
      id: "overview",
      label: "Overview",
      items: [{ href: b(studioId, ""), label: "Home" }],
    },
    {
      id: "schedule",
      label: "Schedule",
      items: [
        { href: b(studioId, "/schedule/sessions"), label: "Sessions" },
        { href: b(studioId, "/schedule/calendar"), label: "Calendar" },
        { href: b(studioId, "/schedule/waitlist"), label: "Waitlist" },
      ],
    },
    {
      id: "programs",
      label: "Classes",
      items: [
        { href: b(studioId, "/programs"), label: "All classes" },
        { href: b(studioId, "/programs/planner"), label: "Planner" },
        { href: b(studioId, "/programs/instructors"), label: "Instructors" },
      ],
    },
    {
      id: "guests",
      label: "Guests",
      items: [{ href: b(studioId, "/guests"), label: "Guests" }],
    },
    {
      id: "commerce",
      label: "Shop",
      items: [
        { href: b(studioId, "/commerce/catalog"), label: "Products" },
        { href: b(studioId, "/commerce/orders"), label: "Orders" },
        { href: b(studioId, "/commerce/gift-cards"), label: "Gift cards" },
        { href: b(studioId, "/commerce/promotions"), label: "Promotions" },
        { href: b(studioId, "/commerce/wearables"), label: "Wearables" },
      ],
    },
    {
      id: "money",
      label: "Money",
      items: [
        { href: b(studioId, "/money/overview"), label: "Overview" },
        { href: b(studioId, "/money/activity"), label: "Activity" },
        { href: b(studioId, "/money/payouts"), label: "Payouts & bank" },
        { href: b(studioId, "/money/tax"), label: "Tax" },
        { href: b(studioId, "/money/reports"), label: "Reports" },
      ],
    },
    {
      id: "site",
      label: "Website",
      items: [
        { href: b(studioId, "/site/page"), label: "Studio page" },
        { href: b(studioId, "/site/domains"), label: "Domain" },
        { href: b(studioId, "/site/reviews"), label: "Reviews" },
        { href: b(studioId, "/site/integrations"), label: "Integrations" },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      items: [
        { href: b(studioId, "/studio-tools/kiln"), label: "Kiln" },
        { href: b(studioId, "/studio-tools/ai"), label: "AI" },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      items: [
        { href: b(studioId, "/settings"), label: "Settings" },
        { href: b(studioId, "/guided"), label: "Simple setup" },
        { href: b(studioId, "/features"), label: "Add-ons" },
      ],
    },
  ];
}

/** Flat list for breadcrumb matching (longest href wins). */
export function getStudioPanelNavFlat(studioId: string): { href: string; label: string }[] {
  return getStudioPanelNavGroups(studioId).flatMap((g) => g.items);
}
