/** Studio Owner Panel — sidebar navigation (paths relative to `/dashboard/[studioId]`). */

export type StudioPanelNavItem = {
  href: string;
  label: string;
};

export function studioPanelNav(studioId: string): StudioPanelNavItem[] {
  const b = (path: string) => `/dashboard/${studioId}${path}`;
  return [
    { href: b(""), label: "Dashboard" },
    { href: b("/calendar"), label: "Calendar" },
    { href: b("/bookings"), label: "Bookings" },
    { href: b("/students"), label: "Students" },
    { href: b("/classes"), label: "Classes" },
    { href: b("/shop"), label: "Products / Shop" },
    { href: b("/kiln"), label: "Kiln / Production" },
    { href: b("/payments"), label: "Payments" },
    { href: b("/analytics"), label: "Analytics" },
    { href: b("/ai"), label: "AI Advisor" },
    { href: b("/features"), label: "Features / Add-ons" },
    { href: b("/settings"), label: "Settings" },
  ];
}
