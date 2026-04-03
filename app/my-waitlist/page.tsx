import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { MyWaitlistClient } from "./my-waitlist-client";

export default function MyWaitlistPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <MyWaitlistClient />
      </main>
    </MarketingLayout>
  );
}
