import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getStudioWearProducts } from "@/lib/studio-wear-catalog";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { displayName: true },
  });
  return {
    title: studio ? `${studio.displayName} — Wearables` : "Wearables",
    robots: { index: false, follow: false },
  };
}

function formatEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default async function EmbedWearablesPage({ params }: Props) {
  const { studioId } = await params;

  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { displayName: true },
  });
  if (!studio) notFound();

  const items = await getStudioWearProducts(studioId);
  if (!items || items.length === 0) {
    return (
      <html lang="en">
        <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <p style={{ padding: 20, textAlign: "center", color: "#78716c", fontSize: 14 }}>
            No wearable products available.
          </p>
        </body>
      </html>
    );
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://potterymania.com";

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 16, fontFamily: "system-ui, -apple-system, sans-serif", background: "transparent" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          {items.map((item) => (
            <a
              key={item.id}
              href={`${baseUrl}/studios/${studioId}/wearables/${item.slug}`}
              target="_top"
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid #e7e5e4",
                background: "#fff",
                transition: "box-shadow 0.2s",
              }}
            >
              <div style={{ position: "relative", width: "100%", paddingBottom: "100%", background: "#f5f5f4" }}>
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="200px"
                    loading="lazy"
                  />
                ) : (
                  <span style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#a8a29e",
                  }}>
                    No image
                  </span>
                )}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1c1917",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {item.name}
                </p>
                {item.subtitle && (
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#78716c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.subtitle}
                  </p>
                )}
                <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700, color: "#292524" }}>
                  {formatEur(item.priceCents)}
                </p>
              </div>
            </a>
          ))}
        </div>
        <p style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#a8a29e" }}>
          Powered by <a href={baseUrl} target="_top" style={{ color: "#78716c", textDecoration: "underline" }}>PotteryMania</a>
        </p>
      </body>
    </html>
  );
}
