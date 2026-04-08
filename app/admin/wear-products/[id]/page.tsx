import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";
import WearProductEditorClient from "@/components/admin/wear-product-editor-client";
import { metaAdminPage } from "@/lib/seo-routes";

export const dynamic = "force-dynamic";

type WearProductParams = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: WearProductParams): Promise<Metadata> {
  const { id } = await params;
  return metaAdminPage("Edit wear product", `/admin/wear-products/${id}`, "Edit wear product, variants, and imagery.");
}

export default async function AdminWearProductEditPage({ params }: WearProductParams) {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const { id } = await params;

  const p = await prisma.wearProduct.findUnique({
    where: { id },
    include: {
      variants: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
    },
  });
  if (!p) notFound();

  const initial = {
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    priceCents: p.priceCents,
    currency: p.currency,
    imagesText: wearImageUrlsFromJson(p.images).join("\n"),
    sortOrder: p.sortOrder,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    archivedAt: p.archivedAt?.toISOString() ?? null,
    externalFulfillmentId: p.externalFulfillmentId,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      sku: v.sku,
      optionSize: v.optionSize,
      optionColor: v.optionColor,
      priceCents: v.priceCents,
      stockQuantity: v.stockQuantity,
      sortOrder: v.sortOrder,
      isActive: v.isActive,
    })),
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Edit · {p.name}</h1>
      <p className="mt-2 text-sm text-stone-600">
        Slug: <span className="font-mono text-xs">{p.slug}</span>
      </p>
      <WearProductEditorClient productId={p.id} initial={initial} />
    </div>
  );
}
