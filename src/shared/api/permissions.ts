/**
 * PLACEHOLDER permission ids. The real ones arrive as `admin-permissions` in
 * `@solab-tech/fusion-shared` (Q8) and replace this file. The UI uses ids only
 * to decide what to render; the API enforces them, and nothing branches on a
 * role name.
 */
export const ADMIN_PERMISSION = {
  OVERVIEW_VIEW: "admin:overview:view",
  TENANTS_VIEW: "admin:tenants:view",
  CONNECTORS_VIEW: "admin:connectors:view",
  RUNS_VIEW: "admin:ingestion:view",
  QUALITY_VIEW: "admin:quality:view",
  AUDIT_VIEW: "admin:audit:view",
  STAFF_VIEW: "admin:staff:view",
  STAFF_INVITE: "admin:staff:invite",
  STAFF_CHANGE_ROLE: "admin:staff:change_role",
  STAFF_DEACTIVATE: "admin:staff:deactivate",
} as const;

export type AdminPermission = (typeof ADMIN_PERMISSION)[keyof typeof ADMIN_PERMISSION];

export function can(permissions: readonly string[], permission: AdminPermission): boolean {
  return permissions.includes(permission);
}
