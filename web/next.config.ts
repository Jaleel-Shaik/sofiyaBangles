import type { NextConfig } from "next";

const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  // Standalone output is only needed for custom Docker builds, not for Vercel
  ...(isVercel ? {} : { output: "standalone" }),
  images: {
    domains: [
      "res.cloudinary.com",
      "images.unsplash.com",
      "via.placeholder.com",
      "lh3.googleusercontent.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  },
};

// Next.js configuration for Sofiya Bangles Admin Portal
export default nextConfig;
