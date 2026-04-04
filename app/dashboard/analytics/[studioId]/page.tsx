"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import StudioAnalyticsPanel from "@/components/dashboard/studio-analytics-panel";

export default function StudioAnalyticsPage() {
  const { studioId } = useParams<{ studioId: string }>();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">Analytics</h1>
      <div className="mt-8">
        <StudioAnalyticsPanel studioId={studioId} />
      </div>
    </div>
  );
}
