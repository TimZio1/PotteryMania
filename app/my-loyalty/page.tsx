import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MarketingLayout } from "@/components/marketing-layout";
import { MyLoyaltyClient } from "./my-loyalty-client";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "My points",
  description: "Points you’ve earned per studio.",
  path: "/my-loyalty",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
});

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
