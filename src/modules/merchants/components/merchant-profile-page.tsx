"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { TenantConnection, SyncRun } from "@/shared/api/contract";
import { errorMessage, isNotFound } from "@/shared/api/errors";
import { useAuditEvents, useRuns, useTenant } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import { DataTable, type Column } from "@/shared/components/data-table";
import { DataUpTo } from "@/shared/components/data-up-to";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { LoadingRegion, RowsSkeleton, Skeleton } from "@/shared/components/skeleton";
import { StatusBadge } from "@/shared/components/status-badge";
import { linkClass, outlineButton } from "@/shared/components/styles";
import { Recorded, TimeCell } from "@/shared/components/time-cell";
import { formatDate } from "@/shared/lib/dates";
import { gatewayLabel, isLaunchGateway } from "@/shared/lib/gateways";
import { formatCount } from "@/shared/lib/number";
import { titleCase } from "@/shared/lib/status";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { useCan } from "@/modules/auth/hooks/use-can";
import { ProjectsSection } from "./projects-section";
import { auditLine } from "@/modules/audit/lib/labels";
import { runColumns } from "@/modules/sync-runs/components/run-columns";

const yes = (v: boolean) => (v ? "Yes" : "No");

const connectionColumns: readonly Column<TenantConnection>[] = [
  { key: "gateway", header: "Gateway", primary: true, cell: (c) => <span className="label-mono">{gatewayLabel(c.gateway)}</span> },
  { key: "label", header: "Label", cell: (c) => c.label },
  { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
  { key: "polling", header: "Polling", cell: (c) => yes(c.polling) },
  { key: "webhooks", header: "Webhooks receiving", cell: (c) => yes(c.webhooksReceiving) },
  { key: "synced", header: "Last synced", cell: (c) => <TimeCell value={c.lastSyncedAt} /> },
  { key: "today", header: "Records today", cell: (c) => <span className="tabular-nums">{formatCount(c.recordsIngestedToday)}</span> },
  { key: "backfill", header: "Backfill depth", cell: (c) => <Recorded value={c.backfillDepth} /> },
];

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function RecentRuns({ tenantId }: { tenantId: string }) {
  const canRuns = useCan(ADMIN_PERMISSION.CONNECTORS_VIEW);
  const { data, isPending, isError } = useRuns({ tenantId }, 5, canRuns).query;
  if (!canRuns) return null;
  const rows: SyncRun[] = data?.items ?? [];
  return (
    <Section
      title="Recent sync runs"
      action={
        <Link href={`/sync-runs?tenantId=${encodeURIComponent(tenantId)}`} className={`${linkClass} text-sm`}>
          All runs for this merchant
        </Link>
      }
    >
      {isPending ? (
        <LoadingRegion label="Loading recent sync runs…">
          <Skeleton className="h-32 w-full" />
        </LoadingRegion>
      ) : isError ? (
        <NoticePanel title="Could not load sync runs" />
      ) : rows.length === 0 ? (
        <NoticePanel title="No sync runs yet" />
      ) : (
        <DataTable caption="Recent sync runs" columns={runColumns} rows={rows} rowKey={(r) => r.id} />
      )}
    </Section>
  );
}

function RecentAudit({ tenantId }: { tenantId: string }) {
  const canAudit = useCan(ADMIN_PERMISSION.AUDIT_VIEW);
  const { data, isPending, isError } = useAuditEvents({ tenantId }, 5, canAudit).query;
  if (!canAudit) return null;
  return (
    <Section
      title="Audit entries"
      action={
        <Link href={`/audit?tenantId=${encodeURIComponent(tenantId)}`} className={`${linkClass} text-sm`}>
          All entries for this merchant
        </Link>
      }
    >
      {isPending ? (
        <LoadingRegion label="Loading audit entries…">
          <Skeleton className="h-24 w-full" />
        </LoadingRegion>
      ) : isError ? (
        <NoticePanel title="Could not load audit entries" />
      ) : data.items.length === 0 ? (
        <NoticePanel title="No audit entries for this merchant" />
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-card px-4 shadow-card">
          {data.items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
              <span>{auditLine(e)}</span>
              <TimeCell value={e.createdAt} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="rounded-card border border-line bg-card px-5 shadow-card">
        <RowsSkeleton label="Loading the merchant…" rows={6} />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function Profile({ id }: { id: string }) {
  const { data: t, isPending, isError, error, refetch } = useTenant(id);

  if (isPending) return <ProfileSkeleton />;
  if (isError) {
    return isNotFound(error) ? (
      <NoticePanel
        title="This merchant isn't here"
        action={
          <Link href="/merchants" className={outlineButton}>
            Back to merchants
          </Link>
        }
      >
        The id may be wrong, or the merchant no longer exists.
      </NoticePanel>
    ) : (
      <NoticePanel
        title="Could not load this merchant"
        action={
          <button type="button" className={outlineButton} onClick={() => void refetch()}>
            Try again
          </button>
        }
      >
        {errorMessage(error)}
      </NoticePanel>
    );
  }

  const connections = t.connections.filter((c) => isLaunchGateway(c.gateway));
  const counts = t.transactionCounts.filter((c) => isLaunchGateway(c.gateway));
  const statuses = [...new Set(counts.map((c) => c.status))];
  const gateways = [...new Set(counts.map((c) => c.gateway))];
  const countOf = (gateway: string, status: string) =>
    counts.find((c) => c.gateway === gateway && c.status === status)?.count ?? 0;

  return (
    <div className="space-y-8">
      <Section title="Account">
        <dl className="grid divide-y divide-line rounded-card border border-line bg-card px-5 text-sm shadow-card sm:grid-cols-2 sm:gap-x-10 sm:divide-y-0">
          {[
            ["Merchant id", <code key="i" className="font-mono text-xs break-all">{t.id}</code>],
            ["Organisation id", <code key="o" className="font-mono text-xs break-all">{t.organisationId}</code>],
            ["Country", t.country],
            ["Timezone", t.timezone],
            ["Reporting currency", t.reportingCurrency],
            ["Created", formatDate(t.createdAt)],
            ["Members", <span key="m" className="tabular-nums">{formatCount(t.memberCount)}</span>],
            ["Last activity", <TimeCell key="a" value={t.lastActivityAt} />],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right text-ink-2">{value}</dd>
            </div>
          ))}
        </dl>
        <DataUpTo value={t.dataUpTo} />
      </Section>

      <Section title="Connections">
        {connections.length === 0 ? (
          <NoticePanel title="No connections yet">This merchant hasn&apos;t connected a gateway.</NoticePanel>
        ) : (
          <DataTable caption="Connections" columns={connectionColumns} rows={connections} rowKey={(c) => c.id} />
        )}
      </Section>

      <Section title="Checkout projects">
        {t.projects ? (
          <ProjectsSection projects={t.projects} />
        ) : (
          // An API that does not report projects yet: not "none", which would be a claim.
          <NoticePanel title="Not recorded">This API version does not report checkout projects yet.</NoticePanel>
        )}
      </Section>

      <Section title="Transaction counts">
        {counts.length === 0 ? (
          <NoticePanel title="Nothing ingested yet">Counts appear after the first sync.</NoticePanel>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line bg-card shadow-card">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Transaction counts by gateway and status</caption>
              <thead className="bg-inset">
                <tr>
                  <th scope="col" className="label-mono px-4 py-2.5 font-normal text-muted">Gateway</th>
                  {statuses.map((s) => (
                    <th key={s} scope="col" className="label-mono px-4 py-2.5 text-right font-normal text-muted">
                      {titleCase(s)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {gateways.map((g) => (
                  <tr key={g}>
                    <th scope="row" className="label-mono px-4 py-3 text-left font-normal text-ink">{gatewayLabel(g)}</th>
                    {statuses.map((s) => (
                      <td key={s} className="px-4 py-3 text-right tabular-nums">{formatCount(countOf(g, s))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">Counts only. Staff never see the transactions themselves.</p>
      </Section>

      <RecentRuns tenantId={t.id} />
      <RecentAudit tenantId={t.id} />
    </div>
  );
}

export function MerchantProfilePage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/merchants" className={linkClass}>
          ← Merchants
        </Link>
      </p>
      <RequirePermission permission={ADMIN_PERMISSION.TENANTS_VIEW}>
        <ProfileHeader id={id} />
        <Profile id={id} />
      </RequirePermission>
    </>
  );
}

function ProfileHeader({ id }: { id: string }) {
  const { data } = useTenant(id);
  return <PageHeader title={data?.name ?? "Merchant"} description="Read-only. No actions are available from here." />;
}
