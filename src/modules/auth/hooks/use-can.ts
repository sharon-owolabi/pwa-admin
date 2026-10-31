"use client";

import { can, type AdminPermission } from "@/shared/api/permissions";
import { useCurrentStaff } from "../components/auth-gate";

/**
 * Whether the signed-in staff member holds `permission`. Decides what to
 * RENDER, nothing more: the API enforces every route. Reads permission ids,
 * never the role name.
 */
export function useCan(permission: AdminPermission): boolean {
  return can(useCurrentStaff().permissions, permission);
}
