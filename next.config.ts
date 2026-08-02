import type { NextConfig } from "next";

/**
 * `output: "standalone"` bundles a minimal, self-contained server into
 * `.next/standalone` — this is what makes deploying to a plain Node.js
 * host (Hostinger VPS / Node.js hosting) simple: copy one small folder,
 * run `node server.js`. It's harmless if you deploy to Vercel instead.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      // Google OAuth profile pictures (only used if you enable Google sign-in)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
