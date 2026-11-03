"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { AuditEvent } from "@/shared/api/contract";
import { useAuditEvents, usePageSize } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import type { Column } from "@/shared/components/data-table";
import { DateFilter, SelectFilter, TextFilter } from "@/shared/components/filter-controls";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTable } from "@/shared/components/paged-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { linkClass } from "@/shared/components/styles";
import { TimeCell } from "@/shared/components/time-cell";
import { dayEndIso, dayStartIso } from "@/shared/lib/dates";
import { countFilters } from "@/shared/lib/filters";
import { uuidOrUndefined } from "@/shared/lib/uuid";
import { AUDIT_SCOPES, oneOf } from "@/shared/lib/vocab";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { actionLabel, actorName, targetLabel } from "../lib/labels";

const KEYS = ["actor", "action", "target", "tenantId", "scope", "from", "to"] as const;

const columns: readonly Column<AuditEvent>[] = [
  { key: "when", header: "When", primary: true, cell: (e) => <TimeCell value={e.createdAt} absolute /> },
  { key: "scope", header: "Scope", cell: (e) => <StatusBadge status="muted" label={e.scope === "platform" ? "Platform" : "Merchant"} /> },
  { key: "actor", header: "Actor", cell: (e) => actorName(e) },
  { key: "action", header: "Action", cell: (e) => actionLabel(e.action) },
  { key: "target", header: "Target", cell: (e) => targetLabel(e) ?? <span className="text-muted">None</span> },
  {
    key: "tenant",
    header: "Merchant",
    cell: (e) =>
      e.workspaceId ? (
        <Link href={`/merchants/${e.workspaceId}`} className={linkClass}>
          <code className="font-mono text-xs">{e.workspaceId}</code>
        </Link>
      ) : (
        <span className="text-muted">None</span>
      ),
  },
  {
    key: "reason",
    header: "Reason",
    cell: (e) => e.reason ?? <span className="text-muted">None given</span>,
  },
];

function Audit() {
  const { filters, setFilter, clear } = useUrlFilters(KEYS);
  const [pageSize, setPageSize] = usePageSize();
  const query = useMemo(
    () => ({
      actor: filters.actor,
      action: filters.action,
      target: filters.target,
      tenantId: uuidOrUndefined(filters.tenantId),
      scope: oneOf(AUDIT_SCOPES, filters.scope),
      from: filters.from ? dayStartIso(filters.from) : undefined,
      to: filters.to ? dayEndIso(filters.to) : undefined,
    }),
    [filters],
  );
  const paged = useAuditEvents(query, pageSize);
  return (
    <PagedTable
      name="audit events"
      singular="Audit event"
      paged={paged}
      pageSize={pageSize}
      onPageSize={setPageSize}
      columns={columns}
      rowKey={(e) => e.id}
      activeFilters={countFilters(filters)}
      onClear={clear}
      filters={
        <>
          <TextFilter label="Actor" value={filters.actor} onChange={(v) => setFilter({ actor: v })} />
          <TextFilter label="Action" value={filters.action} onChange={(v) => setFilter({ action: v })} placeholder="staff.invited" />
          <TextFilter label="Target" value={filters.target} onChange={(v) => setFilter({ target: v })} />
          <TextFilter label="Merchant id (UUID)" value={filters.tenantId} onChange={(v) => setFilter({ tenantId: v })} />
          <SelectFilter
            label="Scope"
            value={filters.scope}
            onChange={(v) => setFilter({ scope: v })}
            options={[
              { value: "platform", label: "Platform" },
              { value: "tenant", label: "Merchant" },
            ]}
          />
          <DateFilter label="From" value={filters.from} onChange={(v) => setFilter({ from: v })} />
          <DateFilter label="To" value={filters.to} onChange={(v) => setFilter({ to: v })} />
        </>
      }
    />
  );
}

export function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit and security"
        description="What staff and merchants did, platform-wide and per merchant. Reading this log is itself recorded."
      />
      <RequirePermission permission={ADMIN_PERMISSION.AUDIT_VIEW}>
        <Audit />
      </RequirePermission>
    </>
  );
}
