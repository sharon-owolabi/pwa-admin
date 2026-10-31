// DUPLICATED FROM apps/app/src/shared/components/skeleton.tsx. Merge into a shared package after the apps/admin code review.
import type { CSSProperties, ReactNode } from "react";

/**
 * Loading states — THE standard for this app (DESIGN.md § Loading states):
 * while data is fetched, show the SHAPE of what is coming, never a blank
 * page, a lone spinner or "Loading…" text.
 *
 * - Mirror the real layout (same container, rows, columns) so nothing jumps
 *   when the data lands.
 * - Wrap the shapes in ONE <LoadingRegion> with a specific label ("Loading
 *   connections…"): screen readers hear that once; the shapes are aria-hidden.
 * - Tokens only; the pulse is `motion-safe` so reduced motion gets a still
 *   placeholder.
 */

/** One placeholder shape. Size it with `className` (h-/w- utilities). */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block rounded-input bg-line motion-safe:animate-pulse ${className}`}
    />
  );
}

/** Announces what is loading, once, and hides the placeholder shapes from assistive tech. */
export function LoadingRegion({
  label,
  className,
  style,
  children,
}: {
  label: string;
  className?: string;
  /** A fixed size, when the region stands in for a frame of one (a dashboard widget). */
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className} style={style}>
      <span className="sr-only">{label}</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}

/**
 * A bordered, divided list — the members / invites shape: two lines of text
 * on the left, a control on the right.
 */
export function ListSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <LoadingRegion label={label}>
      <ul className="divide-y divide-line rounded-card border border-line bg-card shadow-card">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-6 px-4 py-3.5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="hidden h-7 w-28 sm:block" />
            <Skeleton className="h-6 w-16" />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

/** Rows inside an existing panel (schedule, sync runs): a label left, a value right. */
export function RowsSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <LoadingRegion label={label} className="mt-3">
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-40 max-w-[50%]" />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}
