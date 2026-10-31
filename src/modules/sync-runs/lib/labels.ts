import { titleCase } from "@/shared/lib/status";

const KNOWN: Record<string, string> = {
  rate_limited: "Rate limited by the gateway",
  auth_failed: "Gateway rejected the credentials",
  upstream_unavailable: "Gateway unavailable",
  timeout: "Timed out",
  schema_changed: "Gateway response changed shape",
};

/** The error CATEGORY only — never a raw error or checkpoint. null is a gap in what is recorded. */
export function errorCategoryLabel(category: string | null): string {
  if (!category) return "Not recorded";
  return KNOWN[category] ?? titleCase(category);
}
