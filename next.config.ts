import type { NextConfig } from "next";

// Security headers applied to every route. The app handles auth cookies,
// payment QR uploads, and file uploads, so these are worth having even
// though nothing here previously configured them (no next.config.* existed
// at all — see Round 5 audit item #5).
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Product photography, hero visuals, blog images, etc. are all served
    // from Cloudinary. Without this, next/image either fails to load them
    // or silently falls back to unoptimized passthrough — required for the
    // <Image> swap in ProductCard.tsx / ProductDetail.tsx (audit item #3)
    // to actually deliver the responsive srcset / WebP / AVIF benefits.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
