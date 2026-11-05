import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
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

/**
 * The service worker (src/sw.ts → public/sw.js) precaches the app shell: every
 * built JS, CSS and font file, plus these pages and images, so the app opens
 * offline. `/` is not listed: it redirects, and precaching needs a 200.
 * Off in development, where a worker caching half-built files only gets in the way.
 */
const revision = randomUUID();
const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
  // modules/pwa registers the worker itself, so the "New version available" prompt can own the update.
  register: false,
  // Serwist's default reloads the page when the connection returns, which would throw away a screen mid-task.
  reloadOnOnline: false,
  // In-app link clicks are not document requests: cache those pages too, so every visited page opens offline.
  cacheOnNavigation: true,
  additionalPrecacheEntries: [
    // Pages, so they open offline.
    "/offline",
    "/overview",
    "/sign-in",
    // The images every screen shows (public/ files are not in the build output, so they are listed).
    "/brand/fusion-icon.png",
    "/brand/fusion-wordmark-white.png",
    "/icons/icon-192.png",
  ].map((url) => ({ url, revision })),
});

const config: NextConfig = {
  reactStrictMode: true,
  // Serwist is a webpack plugin (`next build --webpack`); this opts the dev server into Turbopack explicitly.
  turbopack: {},
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The worker file must never be served stale, or a deploy could not reach people.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSerwist(config);
