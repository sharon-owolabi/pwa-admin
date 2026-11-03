"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { TenantRow } from "@/shared/api/contract";
import { usePageSize, useTenants } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import type { Column } from "@/shared/components/data-table";
import {
  DateFilter,
  GATEWAY_OPTIONS,
  SelectFilter,
  TextFilter,
} from "@/shared/components/filter-controls";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTable } from "@/shared/components/paged-table";
import { Select } from "@/shared/components/select";
import { linkClass } from "@/shared/components/styles";
import { TimeCell } from "@/shared/components/time-cell";
import { formatDate } from "@/shared/lib/dates";
import { LAUNCH_GATEWAYS } from "@/shared/lib/gateways";
import { CONNECTION_STATUSES, TENANT_SORTS, dateOnly, oneOf } from "@/shared/lib/vocab";
import { countFilters } from "@/shared/lib/filters";
import { titleCase } from "@/shared/lib/status";
import { formatCount } from "@/shared/lib/number";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { RequirePermission } from "@/modules/auth/components/require-permission";

const KEYS = ["search", "gateway", "connectionStatus", "joinedFrom", "joinedTo", "sort"] as const;
const SORTS = [
  { value: "-createdAt", label: "Newest first" },
  { value: "createdAt", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "-name", label: "Name Z–A" },
  { value: "-lastSyncedAt", label: "Synced most recently" },
  { value: "lastSyncedAt", label: "Synced least recently" },
  { value: "-lastActivityAt", label: "Active most recently" },
  { value: "lastActivityAt", label: "Active least recently" },
] as const;

export const merchantColumns: readonly Column<TenantRow>[] = [
  {
    key: "name",
    header: "Merchant",
    primary: true,
    cell: (t) => (
      <Link href={`/merchants/${t.id}`} className={`${linkClass} font-medium`}>
        {t.name}
      </Link>
    ),
  },
  { key: "id", header: "Id", cell: (t) => <code className="font-mono text-xs break-all">{t.id}</code> },
  { key: "country", header: "Country", cell: (t) => t.country },
  { key: "currency", header: "Reporting currency", cell: (t) => t.reportingCurrency },
  { key: "members", header: "Members", cell: (t) => <span className="tabular-nums">{formatCount(t.memberCount)}</span> },
  { key: "connections", header: "Connections", cell: (t) => <span className="tabular-nums">{formatCount(t.connectionCount)}</span> },
  { key: "synced", header: "Last synced", cell: (t) => <TimeCell value={t.lastSyncedAt} /> },
  { key: "joined", header: "Joined", cell: (t) => formatDate(t.createdAt) },
];

function Merchants() {
  const { filters, setFilter, clear } = useUrlFilters(KEYS);
  const [pageSize, setPageSize] = usePageSize();
  const query = useMemo(
    () => ({
      search: filters.search,
      gateway: oneOf(LAUNCH_GATEWAYS, filters.gateway),
      connectionStatus: oneOf(CONNECTION_STATUSES, filters.connectionStatus),
      // The API takes plain dates here (not instants).
      joinedFrom: dateOnly(filters.joinedFrom),
      joinedTo: dateOnly(filters.joinedTo),
      sort: oneOf(TENANT_SORTS, filters.sort),
    }),
    [filters],
  );
  const paged = useTenants(query, pageSize);

  return (
    <PagedTable
      name="merchants"
      singular="Merchant"
      paged={paged}
      pageSize={pageSize}
      onPageSize={setPageSize}
      columns={merchantColumns}
      rowKey={(t) => t.id}
      activeFilters={countFilters(filters, ["sort"])}
      onClear={clear}
      toolbarExtra={
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <Select
            value={filters.sort ?? "-createdAt"}
            onChange={(e) => setFilter({ sort: e.target.value === "-createdAt" ? undefined : e.target.value })}
            className="rounded-input border border-line bg-card py-1.5 pl-2 text-sm text-ink-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
      }
      filters={
        <>
          <TextFilter label="Name or id" value={filters.search} onChange={(v) => setFilter({ search: v })} />
          <SelectFilter label="Gateway" value={filters.gateway} onChange={(v) => setFilter({ gateway: v })} options={GATEWAY_OPTIONS} />
          <SelectFilter
            label="Connection status"
            value={filters.connectionStatus}
            onChange={(v) => setFilter({ connectionStatus: v })}
            options={CONNECTION_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
          />
          <DateFilter label="Joined from" value={filters.joinedFrom} onChange={(v) => setFilter({ joinedFrom: v })} />
          <DateFilter label="Joined to" value={filters.joinedTo} onChange={(v) => setFilter({ joinedTo: v })} />
        </>
      }
    />
  );
}

export function MerchantsPage() {
  return (
    <>
      <PageHeader
        title="Merchants"
        description="Every merchant on the platform. Counts and statuses only: no transactions or customer records are shown here."
      />
      <RequirePermission permission={ADMIN_PERMISSION.TENANTS_VIEW}>
        <Merchants />
      </RequirePermission>
    </>
  );
}
