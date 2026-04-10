import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Prisma (and its native bindings) from being bundled into the
  // Edge runtime or client bundles. Prisma must only run on the Node.js
  // server; the Edge middleware imports `auth` which transitively imports
  // `@/lib/db`, so without this exclusion the build bundles PrismaClient
  // for the browser/Edge and throws at runtime.
  serverExternalPackages: ["@prisma/client", "prisma"],
  async headers() {
    return [
      {
        source: "/wear/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      /* Spreadconnect / SPOD product imagery (catalog sync stores these on WearProduct.images) */
      {
        protocol: "https",
        hostname: "image.spreadshirtmedia.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "productionproductimage.spreadshirtmedia.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.spreadshirtmedia.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
