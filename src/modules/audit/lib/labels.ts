import type { AuditEvent } from "@/shared/api/contract";
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

/** The actor's label, or a stable fallback: the API can send no label (system actions). */
export function actorName(e: Pick<AuditEvent, "actorLabel" | "actorId">): string {
  return e.actorLabel ?? (e.actorId ? `Staff ${e.actorId.slice(0, 8)}` : "System");
}

/** One sentence for the overview's highlights. The API sends no metadata. */
export function auditLine(e: AuditEvent): string {
  const target = targetLabel(e);
  return `${actorName(e)} · ${actionLabel(e.action)}${target ? ` · ${target}` : ""}`;
}
