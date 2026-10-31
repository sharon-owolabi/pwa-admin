import type { StatusTone } from "./status-tone";

/** snake_case → "Sentence case". Unknown values still read fine. */
export function titleCase(value: string): string {
  const spaced = value.replaceAll("_", " ").trim();
  return spaced ? spaced[0]!.toUpperCase() + spaced.slice(1) : spaced;
}

const TONES: Record<string, StatusTone> = {
  // connection
  active: "success",
  connecting: "muted",
  backfilling: "muted",
  degraded: "signal",
  error: "danger",
  paused: "muted",
  revoked: "muted",
  // run / mapping
  succeeded: "success",
  running: "muted",
  failed: "danger",
  cancelled: "muted",
  warned: "signal",
  // staff
  invited: "muted",
  deactivated: "muted",
};

/** An unknown status gets a neutral pill, never a crash (PLAN.md §2). */
export function statusTone(status: string): StatusTone {
  return TONES[status] ?? "muted";
}

export const isInProgress = (status: string): boolean =>
  status === "running" || status === "connecting" || status === "backfilling";
