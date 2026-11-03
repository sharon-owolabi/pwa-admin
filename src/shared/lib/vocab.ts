import type {
  ApprovalStatus,
  ConnectionStatus,
  RunStatus,
  StaffMember,
} from "@/shared/api/contract";

/**
 * The values each filter accepts, typed against the generated contract so a new
 * API value breaks the build here. URL query strings are narrowed through
 * `oneOf`, so a hand-edited URL never sends a value the API would 400.
 */
export const CONNECTION_STATUSES = [
  "active", "connecting", "backfilling", "degraded", "error", "paused", "revoked",
] as const satisfies readonly ConnectionStatus[];
export const RUN_STATUSES = ["running", "succeeded", "failed", "cancelled"] as const satisfies readonly RunStatus[];
export const MAPPING_STATUSES = ["running", "succeeded", "failed"] as const;
export const AUDIT_SCOPES = ["platform", "tenant"] as const;
export const STAFF_STATUSES = ["invited", "active", "deactivated"] as const satisfies readonly StaffMember["status"][];
export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const satisfies readonly ApprovalStatus[];
export const TENANT_SORTS = [
  "-createdAt", "createdAt", "name", "-name", "-lastSyncedAt", "lastSyncedAt", "-lastActivityAt", "lastActivityAt",
] as const;

/** `v` if it is one of `values`, else undefined. */
export function oneOf<const T extends readonly string[]>(values: T, v: string | undefined): T[number] | undefined {
  return v !== undefined && (values as readonly string[]).includes(v) ? (v as T[number]) : undefined;
}

/** A positive integer from a query string, or undefined. */
export function intOrUndefined(v: string | undefined): number | undefined {
  return v !== undefined && /^\d{1,9}$/.test(v) ? Number(v) : undefined;
}

/** A calendar day (YYYY-MM-DD) as the API's `date` parameters take it. */
export function dateOnly(v: string | undefined): string | undefined {
  return v !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}
