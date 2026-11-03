"use client";

import { useMemo, useState } from "react";
import type { Approval } from "@/shared/api/contract";
import { useApprovals, usePageSize, useStaffMutations, useStaffRoles } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import type { Column } from "@/shared/components/data-table";
import { SelectFilter } from "@/shared/components/filter-controls";
import { Modal } from "@/shared/components/modal";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTable } from "@/shared/components/paged-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { smallButton } from "@/shared/components/styles";
import { TimeCell } from "@/shared/components/time-cell";
import { countFilters } from "@/shared/lib/filters";
import { titleCase } from "@/shared/lib/status";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { APPROVAL_STATUSES, oneOf } from "@/shared/lib/vocab";
import { useCurrentStaff } from "@/modules/auth/components/auth-gate";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { useCan } from "@/modules/auth/hooks/use-can";
import { approvalActions, approvalSummary } from "../lib/approvals";
import { ReasonForm } from "./reason-form";
import { StaffTabs } from "./staff-tabs";

const KEYS = ["status"] as const;

type Dialog = { kind: "approve" | "reject" | "cancel"; approval: Approval } | null;

function DecideDialog({ kind, approval, summary, onDone }: { kind: "approve" | "reject"; approval: Approval; summary: string; onDone: (msg: string) => void }) {
  const { approve, reject } = useStaffMutations();
  const m = kind === "approve" ? approve : reject;
  return (
    <ReasonForm
      intro={
        <>
          <strong className="text-ink">{summary}</strong>, asked by {approval.requestedBy.name}: “{approval.reason}”
        </>
      }
      confirmLabel={kind === "approve" ? "Approve" : "Reject"}
      busyLabel={kind === "approve" ? "Approving…" : "Rejecting…"}
      danger={kind === "reject"}
      optionalReason
      error={m.error}
      busy={m.isPending}
      onSubmit={(reason) =>
        m.mutate(
          { approvalId: approval.id, reason: reason || undefined },
          { onSuccess: () => onDone(kind === "approve" ? "Approved. The change has been applied." : "Rejected. Nothing changed.") },
        )
      }
    />
  );
}

function CancelDialog({ approval, summary, onDone }: { approval: Approval; summary: string; onDone: (msg: string) => void }) {
  const { cancel } = useStaffMutations();
  return (
    <ReasonForm
      intro={`Withdraw your request: ${summary}. Nobody needs to approve it any more.`}
      confirmLabel="Withdraw request"
      busyLabel="Withdrawing…"
      optionalReason
      error={cancel.error}
      busy={cancel.isPending}
      onSubmit={() => cancel.mutate({ approvalId: approval.id }, { onSuccess: () => onDone("Your request was withdrawn.") })}
    />
  );
}

function Approvals() {
  const me = useCurrentStaff();
  const canApprove = useCan(ADMIN_PERMISSION.STAFF_APPROVE);
  const canManage = useCan(ADMIN_PERMISSION.STAFF_MANAGE);
  const { filters, setFilter, clear } = useUrlFilters(KEYS);
  const [pageSize, setPageSize] = usePageSize();
  const query = useMemo(() => ({ status: oneOf(APPROVAL_STATUSES, filters.status) }), [filters]);
  const paged = useApprovals(query, pageSize);
  const roles = useStaffRoles(true).data ?? [];
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const done = (message: string) => {
    setNotice(message);
    setDialog(null);
  };

  const columns = useMemo<readonly Column<Approval>[]>(
    () => [
      {
        key: "request",
        header: "Request",
        primary: true,
        cell: (a) => (
          <div>
            <p className="font-medium text-ink">{approvalSummary(a, roles)}</p>
            <p className="text-muted">{a.reason}</p>
          </div>
        ),
      },
      { key: "by", header: "Asked by", cell: (a) => (a.requestedBy.id === me.id ? "You" : a.requestedBy.name) },
      { key: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} label={titleCase(a.status)} /> },
      { key: "asked", header: "Asked", cell: (a) => <TimeCell value={a.createdAt} /> },
      { key: "expires", header: "Expires", cell: (a) => <TimeCell value={a.expiresAt} /> },
      {
        key: "decided",
        header: "Decided by",
        cell: (a) => (a.decidedBy ? a.decidedBy.name : <span className="text-muted">Not yet</span>),
      },
      {
        key: "actions",
        header: "Actions",
        cell: (a) => {
          const can = approvalActions({
            status: a.status,
            requestedById: a.requestedBy.id,
            meId: me.id,
            canApprove,
            canManage,
          });
          if (!can.decide && !can.cancel) return <span className="text-muted">None</span>;
          return (
            <div className="flex flex-wrap gap-2">
              {can.decide ? (
                <>
                  <button type="button" className={smallButton} onClick={() => setDialog({ kind: "approve", approval: a })}>
                    Approve
                  </button>
                  <button type="button" className={smallButton} onClick={() => setDialog({ kind: "reject", approval: a })}>
                    Reject
                  </button>
                </>
              ) : null}
              {can.cancel ? (
                <button type="button" className={smallButton} onClick={() => setDialog({ kind: "cancel", approval: a })}>
                  Withdraw
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [me.id, canApprove, canManage, roles],
  );

  const summary = dialog ? approvalSummary(dialog.approval, roles) : "";
  return (
    <>
      {notice ? (
        <p role="status" className="mb-3 rounded-input bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          {notice}
        </p>
      ) : null}
      <PagedTable
        name="approval requests"
        singular="Approval request"
        paged={paged}
        pageSize={pageSize}
        onPageSize={setPageSize}
        columns={columns}
        rowKey={(a) => a.id}
        activeFilters={countFilters(filters)}
        onClear={clear}
        emptyHint="Nothing is waiting for a second approver."
        filters={
          <SelectFilter
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter({ status: v })}
            options={APPROVAL_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
          />
        }
      />
      <Modal open={dialog?.kind === "approve" || dialog?.kind === "reject"} onClose={() => setDialog(null)} title={dialog?.kind === "reject" ? "Reject this request" : "Approve this request"}>
        {dialog && dialog.kind !== "cancel" ? <DecideDialog kind={dialog.kind} approval={dialog.approval} summary={summary} onDone={done} /> : null}
      </Modal>
      <Modal open={dialog?.kind === "cancel"} onClose={() => setDialog(null)} title="Withdraw your request">
        {dialog?.kind === "cancel" ? <CancelDialog approval={dialog.approval} summary={summary} onDone={done} /> : null}
      </Modal>
    </>
  );
}

export function ApprovalsPage() {
  return (
    <>
      <PageHeader
        title="Staff approvals"
        description="Promotions to Super Admin and invitations to privileged roles wait here for a second person. You can't decide your own request."
      />
      <RequirePermission permission={ADMIN_PERMISSION.STAFF_VIEW}>
        <StaffTabs />
        <Approvals />
      </RequirePermission>
    </>
  );
}
