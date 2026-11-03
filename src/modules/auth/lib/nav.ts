import { ADMIN_PERMISSION, type AdminPermission } from "@/shared/api/permissions";

/**
 * The console's navigation, as data. Billing, Intelligence Ops, Analytics and
 * Operations are omitted until their data exists: no placeholder, not even
 * disabled (PLAN.md decision 3).
 */
export const NAV: readonly { href: string; label: string; permission: AdminPermission }[] = [
  { href: "/overview", label: "Overview", permission: ADMIN_PERMISSION.OVERVIEW_VIEW },
  { href: "/merchants", label: "Merchants", permission: ADMIN_PERMISSION.TENANTS_VIEW },
  { href: "/gateways", label: "Gateways", permission: ADMIN_PERMISSION.CONNECTORS_VIEW },
  { href: "/sync-runs", label: "Sync runs", permission: ADMIN_PERMISSION.CONNECTORS_VIEW },
  { href: "/data-quality", label: "Data quality", permission: ADMIN_PERMISSION.CONNECTORS_VIEW },
  { href: "/audit", label: "Audit and security", permission: ADMIN_PERMISSION.AUDIT_VIEW },
  { href: "/staff", label: "Staff", permission: ADMIN_PERMISSION.STAFF_VIEW },
];

/** The first screen the member may open, for the landing redirect. */
export function firstAllowed(permissions: readonly string[]): string | null {
  return NAV.find((n) => permissions.includes(n.permission))?.href ?? null;
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
