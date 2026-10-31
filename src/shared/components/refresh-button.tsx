"use client";
// DUPLICATED FROM apps/app/src/shared/components/refresh-button.tsx. Merge into a shared package after the apps/admin code review.
import { smallButton } from "./styles";

export function RefreshButton({
  name,
  busy,
  onRefresh,
}: {
  name: string;
  busy: boolean;
  onRefresh: () => void;
}) {
  return (
    <button
      type="button"
      className={`${smallButton} inline-flex items-center gap-1.5`}
      aria-label={`Refresh ${name}`}
      aria-busy={busy}
      aria-disabled={busy}
      onClick={() => {
        if (!busy) onRefresh();
      }}
    >
      <span aria-hidden className={busy ? "motion-safe:animate-spin" : undefined}>
        ↻
      </span>
      {busy ? "Refreshing…" : "Refresh"}
    </button>
  );
}
