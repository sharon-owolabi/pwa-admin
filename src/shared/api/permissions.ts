// DUPLICATED FROM fusion-api/packages/shared/src/admin-permissions.ts (ADMIN_PERMISSION).
// Replace with `admin-permissions` from @solab-tech/fusion-shared once it is published.
//
// The UI uses ids only to decide what to render; the API enforces them, and
// nothing branches on a role name.
export const ADMIN_PERMISSION = {
  OVERVIEW_VIEW: "admin:overview:view",
  TENANTS_VIEW: "admin:tenants:view",
  CONNECTORS_VIEW: "admin:connectors:view",
  AUDIT_VIEW: "admin:audit:view",
  STAFF_VIEW: "admin:staff:view",
  STAFF_MANAGE: "admin:staff:manage",
  STAFF_APPROVE: "admin:staff:approve",
} as const;

export type AdminPermission = (typeof ADMIN_PERMISSION)[keyof typeof ADMIN_PERMISSION];

export function can(permissions: readonly string[], permission: AdminPermission): boolean {
  return permissions.includes(permission);
}
