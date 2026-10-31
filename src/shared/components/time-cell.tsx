import { formatDateTime, formatRelative } from "@/shared/lib/dates";

export function NotRecorded() {
  return <span className="text-muted">Not recorded</span>;
}

/** A timestamp, relative with the exact time on hover. null is "Not recorded". */
export function TimeCell({ value, absolute = false }: { value: string | null; absolute?: boolean }) {
  if (!value) return <NotRecorded />;
  return (
    <time dateTime={value} title={absolute ? formatRelative(value) : formatDateTime(value)}>
      {absolute ? formatDateTime(value) : formatRelative(value)}
    </time>
  );
}

/** A value from the API that may be null: null is "Not recorded", never 0 or blank. */
export function Recorded({ value }: { value: string | number | null | undefined }) {
  return value === null || value === undefined || value === "" ? <NotRecorded /> : <>{value}</>;
}
