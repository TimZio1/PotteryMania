import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { CartContents } from "./cart-contents";

export default function CartPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <CartContents />
      </main>
    </MarketingLayout>
  );
}
