"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { MappingRun } from "@/shared/api/contract";
import { useMappingRuns, usePageSize } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import type { Column } from "@/shared/components/data-table";
import { GATEWAY_OPTIONS, SelectFilter, TextFilter } from "@/shared/components/filter-controls";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTable } from "@/shared/components/paged-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { linkClass } from "@/shared/components/styles";
import { TimeCell } from "@/shared/components/time-cell";
import { countFilters } from "@/shared/lib/filters";
import { LAUNCH_GATEWAYS, gatewayLabel } from "@/shared/lib/gateways";
import { formatCount } from "@/shared/lib/number";
import { titleCase } from "@/shared/lib/status";
import { uuidOrUndefined } from "@/shared/lib/uuid";
import { MAPPING_STATUSES, intOrUndefined, oneOf } from "@/shared/lib/vocab";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { RequirePermission } from "@/modules/auth/components/require-permission";

const KEYS = ["tenantId", "gateway", "mappingVersion", "status"] as const;

const n = (v: number) => <span className="tabular-nums">{formatCount(v)}</span>;

const columns: readonly Column<MappingRun>[] = [
  { key: "started", header: "Started", primary: true, cell: (r) => <TimeCell value={r.startedAt} absolute /> },
  { key: "gateway", header: "Gateway", cell: (r) => <span className="label-mono">{gatewayLabel(r.gateway ?? r.connector)}</span> },
  {
    key: "tenant",
    header: "Merchant",
    cell: (r) => (
      <Link href={`/merchants/${r.workspaceId}`} className={linkClass}>
        <code className="font-mono text-xs break-all">{r.workspaceId}</code>
      </Link>
    ),
  },
  { key: "resource", header: "Resource", cell: (r) => titleCase(r.resource) },
  { key: "version", header: "Mapping version", cell: (r) => <code className="font-mono text-xs">v{r.mappingVersion}</code> },
  { key: "mode", header: "Mode", cell: (r) => titleCase(r.mode) },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  { key: "read", header: "Read", cell: (r) => n(r.recordsRead) },
  { key: "mapped", header: "Mapped", cell: (r) => n(r.recordsMapped) },
  { key: "failed", header: "Failed", cell: (r) => n(r.recordsFailed) },
  { key: "warned", header: "Warned", cell: (r) => n(r.recordsWarned) },
];

function DataQuality() {
  const { filters, setFilter, clear } = useUrlFilters(KEYS);
  const [pageSize, setPageSize] = usePageSize();
  const query = useMemo(
    () => ({
      tenantId: uuidOrUndefined(filters.tenantId),
      gateway: oneOf(LAUNCH_GATEWAYS, filters.gateway),
      mappingVersion: intOrUndefined(filters.mappingVersion),
      status: oneOf(MAPPING_STATUSES, filters.status),
    }),
    [filters],
  );
  const paged = useMappingRuns(query, pageSize);
  return (
    <PagedTable
      name="mapping runs"
      singular="Mapping run"
      paged={paged}
      pageSize={pageSize}
      onPageSize={setPageSize}
      columns={columns}
      rowKey={(r) => r.id}
      activeFilters={countFilters(filters)}
      onClear={clear}
      filters={
        <>
          <TextFilter label="Merchant id (UUID)" value={filters.tenantId} onChange={(v) => setFilter({ tenantId: v })} />
          <SelectFilter label="Gateway" value={filters.gateway} onChange={(v) => setFilter({ gateway: v })} options={GATEWAY_OPTIONS} />
          <TextFilter label="Mapping version" value={filters.mappingVersion} onChange={(v) => setFilter({ mappingVersion: v })} placeholder="3" />
          <SelectFilter
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter({ status: v })}
            options={MAPPING_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
          />
        </>
      }
    />
  );
}

export function DataQualityPage() {
  return (
    <>
      <PageHeader
        title="Data quality"
        description="Mapping exceptions: how many records each run read, mapped, failed or warned on. Counts only, no error bodies."
      />
      <RequirePermission permission={ADMIN_PERMISSION.CONNECTORS_VIEW}>
        <DataQuality />
      </RequirePermission>
    </>
  );
}
