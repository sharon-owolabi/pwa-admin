import type { AuditEvent } from "@/shared/api/contract.draft";
import { titleCase } from "@/shared/lib/status";

/** "staff.role_changed" → "Staff: role changed". Unknown actions still read. */
export function actionLabel(action: string): string {
  const [area, ...rest] = action.split(".");
  if (rest.length === 0) return titleCase(action);
  return `${titleCase(area ?? "")}: ${rest.join(" ").replaceAll("_", " ")}`;
}

/** A target as "connection conn_3_0", or null when there is none. */
export function targetLabel(e: Pick<AuditEvent, "targetType" | "targetId">): string | null {
  if (!e.targetType && !e.targetId) return null;
  return [e.targetType, e.targetId].filter(Boolean).join(" ");
}

/** One sentence for the overview's highlights. `metadata` is never used (Q6). */
export function auditLine(e: AuditEvent): string {
  const target = targetLabel(e);
  return `${e.actorLabel} · ${actionLabel(e.action)}${target ? ` · ${target}` : ""}`;
}
