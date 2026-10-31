import Link from "next/link";
import type { SyncRun } from "@/shared/api/contract.draft";
import type { Column } from "@/shared/components/data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { linkClass } from "@/shared/components/styles";
import { TimeCell } from "@/shared/components/time-cell";
import { gatewayLabel } from "@/shared/lib/gateways";
import { formatCount } from "@/shared/lib/number";
import { titleCase } from "@/shared/lib/status";

export const runColumns: readonly Column<SyncRun>[] = [
  {
    key: "started",
    header: "Started",
    primary: true,
    cell: (r) => (
      <Link href={`/sync-runs/${r.id}`} className={linkClass}>
        <TimeCell value={r.startedAt} absolute />
      </Link>
    ),
  },
  { key: "gateway", header: "Gateway", cell: (r) => <span className="label-mono">{gatewayLabel(r.gateway)}</span> },
  {
    key: "tenant",
    header: "Merchant",
    cell: (r) => (
      <Link href={`/merchants/${r.workspaceId}`} className={linkClass}>
        <code className="font-mono text-xs">{r.workspaceId}</code>
      </Link>
    ),
  },
  { key: "resource", header: "Resource", cell: (r) => titleCase(r.resource) },
  { key: "mode", header: "Mode", cell: (r) => titleCase(r.mode) },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  { key: "fetched", header: "Fetched", cell: (r) => <span className="tabular-nums">{formatCount(r.recordsFetched)}</span> },
];
