import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
