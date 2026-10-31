// DUPLICATED FROM apps/app/src/shared/components/status-badge.tsx. Merge into a shared package after the apps/admin code review.
import { statusTone, titleCase, isInProgress } from "@/shared/lib/status";
import type { StatusTone } from "@/shared/lib/status-tone";

const TONE_CLASS: Record<StatusTone, { pill: string; dot: string }> = {
  success: { pill: "bg-ok-soft text-ok-ink", dot: "bg-ok" },
  signal: { pill: "bg-signal-soft text-signal-ink", dot: "bg-signal" },
  danger: { pill: "bg-danger-soft text-danger", dot: "bg-danger" },
  muted: { pill: "bg-inset text-muted ring-1 ring-line ring-inset", dot: "bg-faint" },
};

/** A status as a pill. Any string works; an unknown one is neutral. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone].pill}`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${TONE_CLASS[tone].dot} ${isInProgress(status) ? "motion-safe:animate-pulse" : ""}`}
      />
      {label ?? titleCase(status)}
    </span>
  );
}
