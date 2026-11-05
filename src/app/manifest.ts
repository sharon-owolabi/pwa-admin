import type { MetadataRoute } from "next";

/*
 * A web manifest cannot read CSS variables, so the two colours are the light
 * theme's --fx-bg (page) written out. They are the only literals outside the
 * token file; keep them in step with packages/design-tokens/tokens.css.
 */
const PAGE_BACKGROUND = "#f3f0ef"; // design-tokens-allow: a manifest cannot use var()

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fusion Admin",
    short_name: "Fusion Admin",
    description: "Internal operations console for Fusion staff.",
    // Not "/": that redirects, and a start page should answer 200 straight away.
    start_url: "/overview",
    scope: "/",
    display: "standalone",
    background_color: PAGE_BACKGROUND,
    theme_color: PAGE_BACKGROUND,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
