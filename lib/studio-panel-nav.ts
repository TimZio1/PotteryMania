/** Studio Owner Panel — sidebar navigation (paths relative to `/dashboard/[studioId]`). */

export type StudioPanelNavItem = {
  href: string;
  label: string;
  section: "overview" | "operations" | "commerce" | "marketing" | "settings";
};

export function studioPanelNav(studioId: string): StudioPanelNavItem[] {
  const b = (path: string) => `/dashboard/${studioId}${path}`;
  return [
    { href: b(""), label: "Today", section: "overview" },
    { href: b("/guided"), label: "Guided setup", section: "overview" },
    { href: b("/analytics"), label: "Reports", section: "overview" },

    { href: b("/bookings"), label: "Session calendar", section: "operations" },
    { href: b("/classes"), label: "Classes", section: "operations" },
    { href: b("/instructors"), label: "Instructors", section: "operations" },
    { href: b("/students"), label: "Participants", section: "operations" },

    { href: b("/shop"), label: "Catalog", section: "commerce" },
    { href: b("/gift-cards"), label: "Gift cards", section: "commerce" },
    { href: b("/payments"), label: "Payments & payouts", section: "commerce" },

    { href: b("/template"), label: "Studio page", section: "marketing" },
    { href: `/studios/${studioId}`, label: "View public page", section: "marketing" },
    { href: b("/reviews"), label: "Reviews moderation", section: "marketing" },

    { href: b("/settings"), label: "Settings", section: "settings" },
  ];
}

/** Studio sidebar items for the current studio owner panel. */
export async function getStudioPanelNavForStudio(studioId: string): Promise<StudioPanelNavItem[]> {
  return studioPanelNav(studioId);
}
