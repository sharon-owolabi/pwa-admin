import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const apiOrigin = new URL(process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:4005").origin;
const isHttps = apiOrigin.startsWith("https:");
const brandAssetsOrigin = process.env.NEXT_PUBLIC_BRAND_ASSETS_URL?.startsWith("http")
  ? new URL(process.env.NEXT_PUBLIC_BRAND_ASSETS_URL).origin
  : null;

/**
 * Mirrors apps/app: no framing, no third-party script or connect origins. The
 * console talks to the admin API origin only. 'unsafe-inline' scripts keep pages
 * statically prerendered (and carry the theme boot script); 'unsafe-eval' is
 * development-only.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data:${brandAssetsOrigin ? ` ${brandAssetsOrigin}` : ""}`,
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Internal tool: keep it out of every index (the metadata robots tag says the same).
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...(isHttps
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const config: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
