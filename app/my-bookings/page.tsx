import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { MyBookingsClient } from "./my-bookings-client";

export default function MyBookingsPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <MyBookingsClient />
      </main>
    </MarketingLayout>
  );
}
