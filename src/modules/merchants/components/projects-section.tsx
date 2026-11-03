import type { Project } from "@/shared/api/contract";
import { DataTable, type Column } from "@/shared/components/data-table";
import { NoticePanel } from "@/shared/components/notice-panel";
import { StatusBadge } from "@/shared/components/status-badge";
import { TimeCell } from "@/shared/components/time-cell";
import { formatDate } from "@/shared/lib/dates";
import { gatewayLabel, isLaunchGateway } from "@/shared/lib/gateways";
import { byPriority, isActiveProject, keyCountsText, sourceLabel } from "../lib/projects";

const columns: readonly Column<Project>[] = [
  {
    key: "project",
    header: "Project",
    primary: true,
    cell: (p) => (
      <div>
        <p className="font-medium text-ink">{p.name}</p>
        <code className="font-mono text-xs text-muted">{p.publicId}</code>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (p) =>
      isActiveProject(p) ? (
        <StatusBadge status="active" label="Active" />
      ) : (
        <StatusBadge status="archived" label="Archived" />
      ),
  },
  { key: "created", header: "Created", cell: (p) => formatDate(p.createdAt) },
  {
    key: "gateways",
    header: "Gateways, in priority order",
    cell: (p) => {
      // Launch gateways only; anything else is hidden, as everywhere in the console.
      const gateways = byPriority(p.gateways).filter((g) => isLaunchGateway(g.gateway));
      if (gateways.length === 0) return <span className="text-muted">No gateways</span>;
      return (
        <ol className="space-y-1">
          {gateways.map((g) => (
            <li key={g.gateway} className="flex flex-wrap items-baseline gap-x-2">
              <span className="label-mono text-ink">
                {g.priority}. {gatewayLabel(g.gateway)}
              </span>
              <span className="text-xs text-muted">
                {sourceLabel(g.sandboxSource)}
                {g.enabledSandbox ? "" : " · sandbox off"}
              </span>
            </li>
          ))}
        </ol>
      );
    },
  },
  {
    key: "keys",
    header: "API keys",
    cell: (p) => (
      <ul className="space-y-0.5">
        <li>Sandbox: {keyCountsText(p.keys.sandbox)}</li>
        <li>Live: {keyCountsText(p.keys.live)}</li>
      </ul>
    ),
  },
  { key: "test", header: "First test payment", cell: (p) => <TimeCell value={p.firstTestPaymentAt} absolute /> },
  { key: "live", header: "First live payment", cell: (p) => <TimeCell value={p.firstLivePaymentAt} absolute /> },
];

/**
 * A merchant's checkout projects: counts, ids and dates only. No keys, secrets,
 * branding or payment content, and no actions (creating, archiving and key
 * actions are held features). Null dates are "Not recorded", never 0 or blank.
 */
export function ProjectsSection({ projects }: { projects: readonly Project[] }) {
  if (projects.length === 0) return <NoticePanel title="No checkout projects yet." />;
  return <DataTable caption="Checkout projects" columns={columns} rows={projects} rowKey={(p) => p.id} />;
}
