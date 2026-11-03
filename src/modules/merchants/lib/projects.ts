import type { KeyCounts, Project, SandboxSource } from "@/shared/api/contract";

const SOURCE_LABEL: Record<SandboxSource, string> = {
  fusion: "Fusion sandbox",
  merchant: "Merchant sandbox",
  simulated: "Simulated",
};

/** An unknown source (a new API value) still reads, never crashes. */
export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source as SandboxSource] ?? source;
}

/** "3 active, 1 revoked". Counts only; zero is a real count here, not a gap. */
export function keyCountsText(counts: KeyCounts): string {
  return `${counts.active} active, ${counts.revoked} revoked`;
}

export const isActiveProject = (p: Pick<Project, "archivedAt">): boolean => p.archivedAt === null;

/** The gateways in the order they are tried (1 first), whatever order they arrive in. */
export function byPriority<T extends { priority: number }>(gateways: readonly T[]): T[] {
  return [...gateways].sort((a, b) => a.priority - b.priority);
}
