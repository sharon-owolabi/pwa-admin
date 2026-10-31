const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function parse(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(iso: string): string {
  const d = parse(iso);
  return d ? dateTime.format(d) : iso;
}

export function formatDate(iso: string): string {
  const d = parse(iso);
  return d ? date.format(d) : iso;
}

/** "2 hours ago". `now` is a parameter so it can be tested. */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const d = parse(iso);
  if (!d) return iso;
  const seconds = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86_400), "day");
}

/** "3m 12s" for a finished run; null while it is still running. */
export function formatDuration(startedAt: string, finishedAt: string | null): string | null {
  if (!finishedAt) return null;
  const a = parse(startedAt);
  const b = parse(finishedAt);
  if (!a || !b) return null;
  const total = Math.max(0, Math.round((b.getTime() - a.getTime()) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** A date input value (YYYY-MM-DD) to the ISO instant the API takes; invalid → undefined. */
export function dayStartIso(day: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T00:00:00.000Z` : undefined;
}
/** The end of a day is the start of the next: `to` is exclusive. */
export function dayEndIso(day: string): string | undefined {
  const start = dayStartIso(day);
  if (!start) return undefined;
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}
