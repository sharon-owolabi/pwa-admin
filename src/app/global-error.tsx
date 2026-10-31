"use client";

import { Brand } from "@/shared/components/brand";
import "./globals.css";

/** The root layout itself threw: this replaces it, html and body included. No providers here. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main role="alert" className="mx-auto max-w-sm px-4 py-16 text-center">
          <div className="mb-6 flex justify-center">
            <Brand size="lg" />
          </div>
          <h1 className="font-semibold">Something went wrong</h1>
          {error.digest ? <p className="mt-2 text-xs text-muted">Reference {error.digest}</p> : null}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-pill bg-button px-4 py-2 text-sm font-semibold text-on-button"
            >
              Try again
            </button>
            {/* A full load: the app's own router may be what failed. */}
            <a href="/overview" className="rounded-pill border border-control px-4 py-2 text-sm text-ink">
              Back to the overview
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
