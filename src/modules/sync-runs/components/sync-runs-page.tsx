"use client";

import { useMemo } from "react";
import { usePageSize, useRuns } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import {
  DateFilter,
  GATEWAY_OPTIONS,
  SelectFilter,
  TextFilter,
} from "@/shared/components/filter-controls";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTable } from "@/shared/components/paged-table";
import { dayEndIso, dayStartIso } from "@/shared/lib/dates";
import { countFilters } from "@/shared/lib/filters";
import { titleCase } from "@/shared/lib/status";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { runColumns } from "./run-columns";

const KEYS = ["tenantId", "gateway", "status", "from", "to"] as const;
const RUN_STATUSES = ["running", "succeeded", "failed", "cancelled"];

function SyncRuns() {
  const { filters, setFilter, clear } = useUrlFilters(KEYS);
  const [pageSize, setPageSize] = usePageSize();
  const query = useMemo(
    () => ({
      tenantId: filters.tenantId,
      gateway: filters.gateway,
      status: filters.status,
      from: filters.from ? dayStartIso(filters.from) : undefined,
      to: filters.to ? dayEndIso(filters.to) : undefined,
    }),
    [filters],
  );
  const paged = useRuns(query, pageSize);
  return (
    <PagedTable
      name="sync runs"
      singular="Sync run"
      paged={paged}
      pageSize={pageSize}
      onPageSize={setPageSize}
      columns={runColumns}
      rowKey={(r) => r.id}
      activeFilters={countFilters(filters)}
      onClear={clear}
      filters={
        <>
          <TextFilter label="Merchant id" value={filters.tenantId} onChange={(v) => setFilter({ tenantId: v })} />
          <SelectFilter label="Gateway" value={filters.gateway} onChange={(v) => setFilter({ gateway: v })} options={GATEWAY_OPTIONS} />
          <SelectFilter
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter({ status: v })}
            options={RUN_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
          />
          <DateFilter label="Started from" value={filters.from} onChange={(v) => setFilter({ from: v })} />
          <DateFilter label="Started to" value={filters.to} onChange={(v) => setFilter({ to: v })} />
        </>
      }
    />
  );
}

export function SyncRunsPage() {
  return (
    <>
      <PageHeader
        title="Sync runs"
        description="Every ingestion run: counts, pages and outcome. Errors appear as a category only."
      />
      <RequirePermission permission={ADMIN_PERMISSION.RUNS_VIEW}>
        <SyncRuns />
      </RequirePermission>
    </>
  );
}
