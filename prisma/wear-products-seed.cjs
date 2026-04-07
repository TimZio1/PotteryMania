/**
 * Native PotteryMania wear catalog — upserted on `npx prisma db seed`.
 */
async function upsertWearProducts(prisma) {
  const items = [
    {
      slug: "studio-mark-tee",
      name: "Studio mark · tee",
      subtitle: "Heavy cotton, minimal mark.",
      description:
        "A quiet signal for people who build with their hands. Cut for everyday wear; print placement kept intentionally spare.",
      priceCents: 2800,
      currency: "EUR",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
      ],
      sortOrder: 10,
    },
    {
      slug: "hands-in-the-clay-longsleeve",
      name: "Hands in the clay · longsleeve",
      subtitle: "For cool studios and early mornings.",
      description: "Long sleeves when the kiln is still warming. Same editorial line as the rest of the drop.",
      priceCents: 3400,
      currency: "EUR",
      images: [
        "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
      ],
      sortOrder: 20,
    },
    {
      slug: "quiet-kiln-cap",
      name: "Quiet kiln · cap",
      subtitle: "Six-panel, unstructured.",
      description: "Low-key headwear for kiln days and market runs. One size with adjustable closure.",
      priceCents: 2400,
      currency: "EUR",
      images: [
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=800&q=80",
      ],
      sortOrder: 30,
    },
    {
      slug: "build-your-space-hoodie",
      name: "Build your space · hoodie",
      subtitle: "Warm layer, clean silhouette.",
      description: "When the studio is cold and the work is long. Fleece-backed; tonal embroidery option later.",
      priceCents: 5200,
      currency: "EUR",
      images: [
        "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&w=800&q=80",
      ],
      sortOrder: 40,
    },
  ];

  for (const p of items) {
    await prisma.wearProduct.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        priceCents: p.priceCents,
        currency: p.currency,
        images: p.images,
        sortOrder: p.sortOrder,
        isActive: true,
        isFeatured: p.slug === "studio-mark-tee",
        archivedAt: null,
      },
      update: {
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        priceCents: p.priceCents,
        currency: p.currency,
        images: p.images,
        sortOrder: p.sortOrder,
        isActive: true,
        isFeatured: p.slug === "studio-mark-tee",
        archivedAt: null,
      },
    });
  }
  console.log("[seed] wear_products upserted (" + items.length + " rows)");
}

module.exports = { upsertWearProducts };
