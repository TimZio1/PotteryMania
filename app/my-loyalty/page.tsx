import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MarketingLayout } from "@/components/marketing-layout";
import { MyLoyaltyClient } from "./my-loyalty-client";

export const dynamic = "force-dynamic";

export default async function MyLoyaltyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/my-loyalty");

  return (
    <MarketingLayout>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <MyLoyaltyClient />
      </main>
    </MarketingLayout>
  );
}
