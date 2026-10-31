"use client";

import Link from "next/link";
import { useOverview } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import { errorMessage } from "@/shared/api/errors";
import { DataUpTo } from "@/shared/components/data-up-to";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { LoadingRegion, Skeleton } from "@/shared/components/skeleton";
import { StatusBadge } from "@/shared/components/status-badge";
import { outlineButton, linkClass } from "@/shared/components/styles";
import { TimeCell } from "@/shared/components/time-cell";
import { gatewayLabel, isLaunchGateway } from "@/shared/lib/gateways";
import { formatCount } from "@/shared/lib/number";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { useCan } from "@/modules/auth/hooks/use-can";
import { auditLine } from "@/modules/audit/lib/labels";

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="label-mono text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <LoadingRegion label="Loading the overview…">
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-card border border-line bg-card p-5 shadow-card">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-card border border-line bg-card p-5 shadow-card">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

function Overview() {
  const { data, isPending, isError, error, refetch } = useOverview();
  const canTenants = useCan(ADMIN_PERMISSION.TENANTS_VIEW);
  const canRuns = useCan(ADMIN_PERMISSION.RUNS_VIEW);
  const canAudit = useCan(ADMIN_PERMISSION.AUDIT_VIEW);

  if (isPending) return <OverviewSkeleton />;
  if (isError) {
    return (
      <NoticePanel
        title="Could not load the overview"
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

  // Only the launch gateways are shown; anything else the API sends is hidden.
  const gateways = data.connectionsByGateway.filter((g) => isLaunchGateway(g.gateway));
  const health = data.syncHealth;
  const healthRows = [
    { status: "succeeded", count: health.succeeded },
    { status: "failed", count: health.failed },
    { status: "running", count: health.running },
    { status: "cancelled", count: health.cancelled },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Merchants">
          <p className="text-4xl font-semibold tracking-tight text-ink tabular-nums">
            {formatCount(data.tenants.total)}
          </p>
          {canTenants ? (
            <Link href="/merchants" className={`${linkClass} mt-3 inline-block text-sm`}>
              View all merchants
            </Link>
          ) : null}
        </Card>
        <Card title={`Sync runs, last ${health.windowHours} hours`}>
          <ul className="grid grid-cols-2 gap-3">
            {healthRows.map((r) => (
              <li key={r.status} className="flex items-center justify-between gap-2">
                <StatusBadge status={r.status} />
                {canRuns ? (
                  <Link
                    href={`/sync-runs?status=${r.status}`}
                    className={`${linkClass} text-sm tabular-nums`}
                    aria-label={`${formatCount(r.count)} ${r.status} runs`}
                  >
                    {formatCount(r.count)}
                  </Link>
                ) : (
                  <span className="text-sm tabular-nums">{formatCount(r.count)}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Freshness">
          <p className="text-sm text-ink-2">Figures on this page are as of the last completed sync.</p>
          <p className="mt-3">
            <DataUpTo value={data.dataUpTo} />
          </p>
        </Card>
      </div>

      <Card title="Connections by gateway">
        {gateways.length === 0 ? (
          <p className="text-sm text-muted">No connections have been made yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {gateways.map((g) => (
              <li key={g.gateway} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="w-36">
                  <p className="label-mono text-ink">{gatewayLabel(g.gateway)}</p>
                  <p className="text-sm text-muted tabular-nums">{formatCount(g.total)} connections</p>
                </div>
                <ul className="flex flex-1 flex-wrap gap-2">
                  {Object.entries(g.byStatus)
                    .filter(([, n]) => n > 0)
                    .map(([status, n]) => (
                      <li key={status} className="flex items-center gap-1.5">
                        <StatusBadge status={status} />
                        {canTenants ? (
                          <Link
                            href={`/merchants?gateway=${g.gateway}&connectionStatus=${status}`}
                            className={`${linkClass} text-sm tabular-nums`}
                          >
                            {formatCount(n)}
                          </Link>
                        ) : (
                          <span className="text-sm tabular-nums">{formatCount(n)}</span>
                        )}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canAudit ? (
        <Card
          title="Recent audit highlights"
          action={
            <Link href="/audit" className={`${linkClass} text-sm`}>
              Open the audit log
            </Link>
          }
        >
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-muted">Nothing has been recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentAudit.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
                  <span className="text-ink-2">{auditLine(e)}</span>
                  <TimeCell value={e.createdAt} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <NoticePanel title="Not available yet">
        Billing, plans, revenue, trials, coupons, costs and feature flags are not recorded by the platform yet, so
        this console shows none of them rather than estimating.
      </NoticePanel>
    </div>
  );
}

export function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="How the platform is doing, in counts and statuses." />
      <RequirePermission permission={ADMIN_PERMISSION.OVERVIEW_VIEW}>
        <Overview />
      </RequirePermission>
    </>
  );
}
