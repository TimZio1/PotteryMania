import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import { loadBusinessTemplateAdminOverview } from "@/lib/admin-business-templates-overview";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const overview = await loadBusinessTemplateAdminOverview();
  return NextResponse.json(overview);
}
