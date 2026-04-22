import type { Metadata } from "next";
import { PlatformChrome } from "@/components/platform/platform-chrome";
import { metaPublicPage } from "@/lib/seo-routes";
import { platformUi } from "@/lib/ui-styles";
import { MyBookingsClient } from "./my-bookings-client";

export const metadata: Metadata = metaPublicPage(
  "My bookings",
  "/my-bookings",
  "All your classes in one place.",
);

type Props = {
  searchParams?: Promise<{ remainder_paid?: string; remainder_cancelled?: string }>;
};

export default async function MyBookingsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const statusMessage =
    typeof sp.remainder_paid === "string" && sp.remainder_paid
      ? "Balance paid. Thanks."
      : typeof sp.remainder_cancelled === "string" && sp.remainder_cancelled
        ? "Payment cancelled — nothing charged."
        : "";
  return (
    <PlatformChrome headerVariant="account">
      <main className={`${platformUi.pageContainer} py-8 sm:py-12`}>
        <MyBookingsClient initialMessage={statusMessage} />
      </main>
    </PlatformChrome>
  );
}
