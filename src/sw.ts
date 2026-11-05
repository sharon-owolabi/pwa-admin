import { defaultCache } from "@serwist/next/worker";
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from "serwist";
import { SKIP_WAITING_MESSAGE } from "./modules/pwa/lib/sw-update";

/**
 * The service worker, built by @serwist/next into public/sw.js. Read-only
 * offline: it keeps the app shell and the pages that were visited so the app
 * opens without a connection; there are no offline writes and no background sync.
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected at build time: every JS, CSS, font and image file, plus the extra entries from next.config.ts.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // A new version waits until the person taps "Refresh" (modules/pwa), so
  // nothing changes under them mid-task. The first install activates at once.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  // Pages as they are visited (network first, cache when offline), and static assets.
  runtimeCaching: defaultCache,
  // A page that was never visited and is offline: the /offline page.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

self.addEventListener("message", (event) => {
  if (event.data?.type === SKIP_WAITING_MESSAGE) void self.skipWaiting();
});

serwist.addEventListeners();
