"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Connector } from "@/shared/api/contract.draft";
import { errorMessage } from "@/shared/api/errors";
import { useConnectors, usePageSize, useTenants } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import { DataUpTo } from "@/shared/components/data-up-to";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTable } from "@/shared/components/paged-table";
import { LoadingRegion, Skeleton } from "@/shared/components/skeleton";
import { StatusBadge } from "@/shared/components/status-badge";
import { linkClass, outlineButton } from "@/shared/components/styles";
import { Recorded, TimeCell } from "@/shared/components/time-cell";
import { gatewayLabel, isLaunchGateway, LAUNCH_GATEWAYS, type LaunchGateway } from "@/shared/lib/gateways";
import { formatCount } from "@/shared/lib/number";
import { titleCase } from "@/shared/lib/status";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { useCan } from "@/modules/auth/hooks/use-can";
import { merchantColumns } from "@/modules/merchants/components/merchants-page";

const KEYS = ["gateway"] as const;

function Counts({ title, counts, hrefFor }: { title: string; counts: Record<string, number>; hrefFor?: (key: string) => string | null }) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  return (
    <div>
      <h3 className="label-mono mb-2 text-muted">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">None</p>
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {entries.map(([key, n]) => {
            const href = hrefFor?.(key);
            return (
              <li key={key} className="flex items-center gap-1.5">
                <StatusBadge status={key} />
                {href ? (
                  <Link href={href} className={`${linkClass} text-sm tabular-nums`}>
                    {formatCount(n)}
                  </Link>
                ) : (
                  <span className="text-sm tabular-nums">{formatCount(n)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GatewayCard({ c, selected }: { c: Connector; selected: boolean }) {
  const canRuns = useCan(ADMIN_PERMISSION.RUNS_VIEW);
  const name = gatewayLabel(c.gateway);
  return (
    <article
      aria-label={name}
      className={`space-y-4 rounded-card border bg-card p-5 shadow-card ${selected ? "border-accent" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="label-mono text-ink">{name}</h2>
          <p className="mt-1 text-sm text-muted tabular-nums">{formatCount(c.tenantsEnabled)} merchants enabled</p>
        </div>
        <Link href={`/gateways?gateway=${c.gateway}`} className={`${linkClass} text-sm`} aria-current={selected ? "true" : undefined}>
          {selected ? "Showing merchants" : "Show merchants"}
        </Link>
      </div>
      <Counts title="Connections" counts={c.connectionsByStatus} hrefFor={(s) => `/merchants?gateway=${c.gateway}&connectionStatus=${s}`} />
      <Counts
        title="Recent runs"
        counts={c.runOutcomes}
        hrefFor={canRuns ? (s) => `/sync-runs?gateway=${c.gateway}&status=${s}` : undefined}
      />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
        <dt className="text-muted">Last synced</dt>
        <dd className="text-right"><TimeCell value={c.lastSyncedAt} /></dd>
        <dt className="text-muted">Adapter version</dt>
        <dd className="text-right"><Recorded value={c.adapterVersion} /></dd>
        <dt className="text-muted">Rate-limit hits</dt>
        <dd className="text-right tabular-nums"><Recorded value={c.rateLimitHits} /></dd>
        <dt className="text-muted">Circuit breaker</dt>
        <dd className="text-right"><Recorded value={c.circuitState ? titleCase(c.circuitState) : null} /></dd>
      </dl>
      <DataUpTo value={c.lastSyncedAt} provider={name} />
    </article>
  );
}

function GatewayMerchants({ gateway }: { gateway: LaunchGateway }) {
  const [pageSize, setPageSize] = usePageSize();
  const query = useMemo(() => ({ gateway }), [gateway]);
  const paged = useTenants(query, pageSize);
  return (
    <section className="mt-10" aria-label={`${gatewayLabel(gateway)} merchants`}>
      <h2 className="mb-3 text-lg font-semibold">Merchants on {gatewayLabel(gateway)}</h2>
      <PagedTable
        name="merchants"
        singular="Merchant"
        paged={paged}
        pageSize={pageSize}
        onPageSize={setPageSize}
        columns={merchantColumns}
        rowKey={(t) => t.id}
        activeFilters={0}
        onClear={() => undefined}
        emptyHint={`No merchant has connected ${gatewayLabel(gateway)} yet.`}
      />
    </section>
  );
}

function Gateways() {
  const { filters } = useUrlFilters(KEYS);
  const canTenants = useCan(ADMIN_PERMISSION.TENANTS_VIEW);
  const { data, isPending, isError, error, refetch } = useConnectors();
  const selected = isLaunchGateway(filters.gateway) ? filters.gateway : LAUNCH_GATEWAYS[0];

  if (isPending) {
    return (
      <LoadingRegion label="Loading gateways…">
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-card border border-line bg-card p-5 shadow-card">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </LoadingRegion>
    );
  }
  if (isError) {
    return (
      <NoticePanel
        title="Could not load gateways"
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
  // Only the three launch gateways, in a fixed order.
  const cards = LAUNCH_GATEWAYS.map((g) => data.items.find((c) => c.gateway === g)).filter(
    (c): c is Connector => c !== undefined,
  );
  return (
    <>
      <div className="mb-4">
        <DataUpTo value={data.dataUpTo} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <GatewayCard key={c.gateway} c={c} selected={c.gateway === selected} />
        ))}
      </div>
      {canTenants ? <GatewayMerchants key={selected} gateway={selected} /> : null}
    </>
  );
}

export function GatewaysPage() {
  return (
    <>
      <PageHeader
        title="Gateways"
        description="Paystack, Flutterwave and Interswitch: connection health, recent runs and the merchants on each."
      />
      <RequirePermission permission={ADMIN_PERMISSION.CONNECTORS_VIEW}>
        <Gateways />
      </RequirePermission>
    </>
  );
}
