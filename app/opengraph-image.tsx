/**
 * Default OG image for /, served at /opengraph-image.
 *
 * Replaces the missing /og-default.png so Facebook / X / LinkedIn / WhatsApp / Slack
 * have a real 1200x630 preview to ingest. Pages override per-route via `buildMetadata({ image })`.
 */
import { ImageResponse } from "next/og";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";

export const runtime = "edge";

export const alt = "PotteryMania — Made with heat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const apparel = isApparelOnlyLaunch();
  const headline = apparel ? "The drop." : "PotteryMania";
  const sub = apparel ? "Apparel for makers" : "Pottery shop & studio software";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(circle at 20% 0%, #FFE7CC 0%, #F4EFE9 55%, #ECE3D5 100%)",
          color: "#0E0E0E",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#FF5A1F",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#FF5A1F",
              boxShadow: "0 0 24px rgba(255,90,31,0.6)",
            }}
          />
          Made with heat
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              fontSize: 220,
              lineHeight: 0.92,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#0E0E0E",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 500,
              color: "#5A4A3F",
            }}
          >
            {sub}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#5A4A3F",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex" }}>potterymania.com</div>
          <div style={{ display: "flex", color: "#FF5A1F" }}>Built different</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
