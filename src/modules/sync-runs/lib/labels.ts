import { titleCase } from "@/shared/lib/status";

const KNOWN: Record<string, string> = {
  auth_failed: "Gateway rejected the credentials",
  rate_limited: "Rate limited by the gateway",
  upstream_error: "Gateway returned an error",
  connection_unavailable: "Connection unavailable",
  credentials_unreadable: "Stored credentials could not be read",
  enqueue_failed: "Could not queue the run",
  internal_error: "Internal error",
  interrupted: "Interrupted",
  unknown: "Unknown",
};

/** The error CATEGORY only — never a raw error or checkpoint. null is a gap in what is recorded. */
export function errorCategoryLabel(category: string | null): string {
  if (!category) return "Not recorded";
  return KNOWN[category] ?? titleCase(category);
}
