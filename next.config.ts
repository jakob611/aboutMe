import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Helpful defaults for a static-ish personal site deployed on Cloudflare.
  reactStrictMode: true,
  async headers() {
    const headers = [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [{ source: "/admin/:path*", headers }, { source: "/api/admin/:path*", headers }];
  },
  images: {
    // Allow remote images from your own Google Drive / CDN if you add them later.
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
