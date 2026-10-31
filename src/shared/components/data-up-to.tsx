import { formatDateTime, formatRelative } from "@/shared/lib/dates";

/**
 * `data up to {time}` wherever a figure could be stale (R6.11). Provider-level
 * figures say which provider. null is a gap, not a time.
 */
export function DataUpTo({ value, provider }: { value: string | null; provider?: string }) {
  const subject = provider ? `${provider} data` : "Data";
  if (!value) return <span className="text-sm text-muted">{subject}: not synced yet</span>;
  return (
    <span className="text-sm text-muted">
      {subject} up to{" "}
      <time dateTime={value} title={formatDateTime(value)}>
        {formatRelative(value)}
      </time>
    </span>
  );
}
