import type { Approval, StaffRole } from "@/shared/api/contract";
import { actionLabel } from "@/modules/audit/lib/labels";

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/**
 * One line for an approval request. The payload is free-form JSON, so only the
 * keys the API is known to send are read (roleKey, email, name); anything else
 * falls back to the action's label.
 */
export function approvalSummary(a: Pick<Approval, "action" | "payload" | "targetId">, roles: readonly StaffRole[]): string {
  const payload = a.payload ?? {};
  const roleKey = str(payload.roleKey);
  const role = roleKey ? (roles.find((r) => r.key === roleKey)?.name ?? roleKey) : null;
  if (a.action === "staff.role_elevation" && role) {
    return `Promote ${a.targetId ? `staff ${a.targetId.slice(0, 8)}` : "a staff member"} to ${role}`;
  }
  if (a.action === "staff.invite_privileged" && role) {
    const email = str(payload.email);
    const name = str(payload.name);
    const who = name && email ? `${name} (${email})` : (email ?? name ?? "a new staff member");
    return `Invite ${who} as ${role}`;
  }
  return actionLabel(a.action);
}

/**
 * What a member of staff may do with a request: approvers decide others'
 * requests, never their own (the API refuses it); the requester may withdraw a
 * pending request of their own.
 */
export function approvalActions(input: {
  status: Approval["status"];
  requestedById: string;
  meId: string;
  canApprove: boolean;
  canManage: boolean;
}): { decide: boolean; cancel: boolean } {
  const pending = input.status === "pending";
  const own = input.requestedById === input.meId;
  return {
    decide: pending && input.canApprove && !own,
    cancel: pending && input.canManage && own,
  };
}
