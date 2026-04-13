import { hasStudioFeature } from "@/lib/studio-features";

/** Studio Owner Panel — sidebar navigation (paths relative to `/dashboard/[studioId]`). */

export type StudioPanelNavItem = {
  href: string;
  label: string;
};

export function studioPanelNav(studioId: string): StudioPanelNavItem[] {
  const b = (path: string) => `/dashboard/${studioId}${path}`;
  return [
    { href: b(""), label: "Today" },
    { href: b("/bookings"), label: "Session calendar" },
    { href: b("/classes"), label: "Classes" },
    { href: b("/add-ons"), label: "Class add-ons" },
    { href: b("/intake-forms"), label: "Booking questions" },
    { href: b("/client-fields"), label: "Client profile fields" },
    { href: b("/loyalty"), label: "Loyalty points" },
    { href: b("/book-soon"), label: "Book soon reminders" },
    { href: b("/reviews"), label: "Reviews moderation" },
    { href: b("/notifications"), label: "Notifications" },
    { href: b("/gift-cards"), label: "Gift cards" },
    { href: b("/packages"), label: "Class packages" },
    { href: b("/memberships"), label: "Memberships" },
    { href: b("/shop"), label: "Catalog" },
    { href: b("/payments"), label: "Payments & payouts" },
    { href: b("/students"), label: "Participants" },
    { href: b("/calendar"), label: "Schedule" },
    { href: b("/template"), label: "Studio page" },
    { href: `/studios/${studioId}`, label: "View public page" },
    { href: b("/settings"), label: "Settings" },
    { href: b("/guided"), label: "Guided setup" },
    { href: b("/analytics"), label: "Reports" },
    { href: b("/tax-report"), label: "Tax report" },
    { href: b("/ai"), label: "AI Advisor" },
    { href: b("/features"), label: "Packs & add-ons" },
    { href: b("/kiln"), label: "Production" },
  ];
}

/** Sidebar items respecting platform feature gates (e.g. kiln add-on). */
export async function getStudioPanelNavForStudio(studioId: string): Promise<StudioPanelNavItem[]> {
  const all = studioPanelNav(studioId);
  const [kilnOk, aiOk] = await Promise.all([
    hasStudioFeature(studioId, "kiln_tracking"),
    hasStudioFeature(studioId, "ai_advisor"),
  ]);
  return all.filter((i) => {
    if (i.href.endsWith("/kiln") && !kilnOk) return false;
    if (i.href.endsWith("/ai") && !aiOk) return false;
    return true;
  });
}
