import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Helpful defaults for a static-ish personal site deployed on Cloudflare.
  reactStrictMode: true,
  images: {
    // Allow remote images from your own Google Drive / CDN if you add them later.
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Ensure uploads directory is kept out of the build output.
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
};

export default nextConfig;
