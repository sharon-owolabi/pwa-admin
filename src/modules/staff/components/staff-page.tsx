"use client";

import { useMemo, useState } from "react";
import type { StaffMember, StaffRole } from "@/shared/api/contract";
import { errorMessage } from "@/shared/api/errors";
import {
  usePageSize,
  usePendingApprovalTargets,
  useSessions,
  useStaff,
  useStaffMutations,
  useStaffRoles,
} from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import type { Column } from "@/shared/components/data-table";
import { SelectFilter, TextFilter } from "@/shared/components/filter-controls";
import { Field, FormError } from "@/shared/components/field";
import { Modal } from "@/shared/components/modal";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTable } from "@/shared/components/paged-table";
import { ListSkeleton } from "@/shared/components/skeleton";
import { Select } from "@/shared/components/select";
import { StatusBadge } from "@/shared/components/status-badge";
import { inputClass, primaryButton, smallButton } from "@/shared/components/styles";
import { TimeCell } from "@/shared/components/time-cell";
import { countFilters } from "@/shared/lib/filters";
import { titleCase } from "@/shared/lib/status";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { describeDevice } from "@/shared/lib/user-agent";
import { STAFF_STATUSES, oneOf } from "@/shared/lib/vocab";
import { useCurrentStaff } from "@/modules/auth/components/auth-gate";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { useCan } from "@/modules/auth/hooks/use-can";
import { ReasonForm } from "./reason-form";
import { StaffTabs } from "./staff-tabs";

const KEYS = ["status", "role", "search"] as const;

type Dialog =
  | { kind: "invite" }
  | { kind: "role"; member: StaffMember }
  | { kind: "deactivate"; member: StaffMember }
  | { kind: "reissue"; member: StaffMember }
  | { kind: "reset"; member: StaffMember }
  | null;

function RoleSelect({ roles, value, onChange, id }: { roles: readonly StaffRole[]; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <Select id={id} block value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} py-2`}>
      <option value="">Choose a role</option>
      {roles.map((r) => (
        <option key={r.key} value={r.key}>
          {r.name}
        </option>
      ))}
    </Select>
  );
}

const WAITING = "Waiting for a second approver. Nothing changes until they approve.";

function InviteDialog({ roles, onDone }: { roles: readonly StaffRole[]; onDone: (msg: string) => void }) {
  const { invite } = useStaffMutations();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <ReasonForm
      confirmLabel="Send invitation"
      busyLabel="Sending…"
      error={invite.error}
      busy={invite.isPending}
      extraValid={emailOk && name.trim() !== "" && roleKey !== ""}
      extra={
        <>
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus />
          <Field label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          <div>
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-ink">Role</label>
            <RoleSelect id="invite-role" roles={roles} value={roleKey} onChange={setRoleKey} />
          </div>
        </>
      }
      onSubmit={(reason) =>
        invite.mutate(
          { email: email.trim(), name: name.trim(), roleKey, reason },
          {
            onSuccess: (result) =>
              onDone(
                result.status === "pending_approval"
                  ? `The invitation to ${email.trim()} ${WAITING.toLowerCase()}`
                  : result.value.emailSent
                    ? `Invitation sent to ${email.trim()}.`
                    : `${email.trim()} was invited, but the email could not be sent. Use “Send again” on their row once mail works.`,
              ),
          },
        )
      }
    />
  );
}

function RoleDialog({ member, roles, onDone }: { member: StaffMember; roles: readonly StaffRole[]; onDone: (msg: string) => void }) {
  const { changeRole } = useStaffMutations();
  const [roleKey, setRoleKey] = useState("");
  return (
    <ReasonForm
      intro={<>{member.name} is currently <strong className="text-ink">{member.role.name}</strong>. Some roles need a second approver; the change then waits.</>}
      confirmLabel="Change role"
      busyLabel="Saving…"
      error={changeRole.error}
      busy={changeRole.isPending}
      extraValid={roleKey !== "" && roleKey !== member.role.key}
      extra={
        <div>
          <label htmlFor="new-role" className="mb-1 block text-sm font-medium text-ink">New role</label>
          <RoleSelect id="new-role" roles={roles.filter((r) => r.key !== member.role.key)} value={roleKey} onChange={setRoleKey} />
        </div>
      }
      onSubmit={(reason) =>
        changeRole.mutate(
          { staffId: member.id, roleKey, reason },
          {
            onSuccess: (result) =>
              onDone(
                result.status === "pending_approval"
                  ? `${member.name}'s role change: ${WAITING.toLowerCase()}`
                  : `${member.name}'s role was changed to ${result.value.role.name}.`,
              ),
          },
        )
      }
    />
  );
}

function DeactivateDialog({ member, onDone }: { member: StaffMember; onDone: (msg: string) => void }) {
  const { deactivate } = useStaffMutations();
  return (
    <ReasonForm
      intro={`${member.name} will lose access to the console straight away, and their sessions end.`}
      confirmLabel="Deactivate"
      busyLabel="Deactivating…"
      danger
      error={deactivate.error}
      busy={deactivate.isPending}
      onSubmit={(reason) =>
        deactivate.mutate({ staffId: member.id, reason }, { onSuccess: () => onDone(`${member.name} was deactivated.`) })
      }
    />
  );
}

const mailNotice = (name: string, sent: boolean) =>
  sent ? `A fresh invitation was sent to ${name}.` : `A fresh invitation was created for ${name}, but the email could not be sent.`;

function ReissueDialog({ member, onDone }: { member: StaffMember; onDone: (msg: string) => void }) {
  const { reissue } = useStaffMutations();
  return (
    <ReasonForm
      intro={`Send ${member.name} a new invitation link. The old link stops working.`}
      confirmLabel="Send again"
      busyLabel="Sending…"
      error={reissue.error}
      busy={reissue.isPending}
      onSubmit={(reason) =>
        reissue.mutate({ staffId: member.id, reason }, { onSuccess: (m) => onDone(mailNotice(member.name, m.emailSent)) })
      }
    />
  );
}

function ResetDialog({ member, onDone }: { member: StaffMember; onDone: (msg: string) => void }) {
  const { resetCredentials } = useStaffMutations();
  return (
    <ReasonForm
      intro={`This removes ${member.name}'s password and authenticator, ends their sessions and sends a new invitation. Use it when they have lost their authenticator.`}
      confirmLabel="Reset credentials"
      busyLabel="Resetting…"
      danger
      error={resetCredentials.error}
      busy={resetCredentials.isPending}
      onSubmit={(reason) =>
        resetCredentials.mutate(
          { staffId: member.id, reason },
          { onSuccess: (m) => onDone(`${member.name}'s credentials were reset. ${mailNotice(member.name, m.emailSent)}`) },
        )
      }
    />
  );
}

function Members() {
  const me = useCurrentStaff();
  const canManage = useCan(ADMIN_PERMISSION.STAFF_MANAGE);
  const { filters, setFilter, clear } = useUrlFilters(KEYS);
  const [pageSize, setPageSize] = usePageSize();
  const query = useMemo(
    () => ({ status: oneOf(STAFF_STATUSES, filters.status), role: filters.role, search: filters.search }),
    [filters],
  );
  const paged = useStaff(query, pageSize);
  const roles = useStaffRoles(true);
  const waiting = usePendingApprovalTargets(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const done = (message: string) => {
    setNotice(message);
    setDialog(null);
  };

  const columns = useMemo<readonly Column<StaffMember>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        primary: true,
        cell: (m) => (
          <div>
            <p className="font-medium text-ink">
              {m.name}
              {m.id === me.id ? <span className="ml-2 text-xs font-normal text-muted">You</span> : null}
            </p>
            <p className="text-muted">{m.email}</p>
          </div>
        ),
      },
      { key: "role", header: "Role", cell: (m) => m.role.name },
      {
        key: "status",
        header: "Status",
        cell: (m) => (
          <div className="space-y-1">
            <StatusBadge status={m.status} />
            {waiting.data?.has(m.id) ? <p className="text-xs text-signal-ink">Waiting for a second approver</p> : null}
          </div>
        ),
      },
      { key: "login", header: "Last sign-in", cell: (m) => <TimeCell value={m.lastLoginAt} /> },
      {
        key: "actions",
        header: "Actions",
        hideOnCard: false,
        cell: (m) => {
          const self = m.id === me.id;
          if (!canManage || self) return <span className="text-muted">{self ? "Your own account" : "None"}</span>;
          return (
            <div className="flex flex-wrap gap-2">
              {m.status === "active" ? (
                <button type="button" className={smallButton} onClick={() => setDialog({ kind: "role", member: m })}>
                  Change role
                </button>
              ) : null}
              {m.status === "invited" ? (
                <button type="button" className={smallButton} onClick={() => setDialog({ kind: "reissue", member: m })}>
                  Send again
                </button>
              ) : null}
              {m.status !== "deactivated" ? (
                <button type="button" className={smallButton} onClick={() => setDialog({ kind: "reset", member: m })}>
                  Reset credentials
                </button>
              ) : null}
              {m.status !== "deactivated" ? (
                <button type="button" className={smallButton} onClick={() => setDialog({ kind: "deactivate", member: m })}>
                  Deactivate
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [me.id, canManage, waiting.data],
  );

  const roleList = roles.data ?? [];
  return (
    <>
      {notice ? (
        <p role="status" className="mb-3 rounded-input bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          {notice}
        </p>
      ) : null}
      <PagedTable
        name="staff"
        singular="Staff"
        paged={paged}
        pageSize={pageSize}
        onPageSize={setPageSize}
        columns={columns}
        rowKey={(m) => m.id}
        activeFilters={countFilters(filters)}
        onClear={clear}
        toolbarExtra={
          canManage ? (
            <button type="button" className={`${primaryButton} !py-1.5 !text-xs`} onClick={() => setDialog({ kind: "invite" })} disabled={roles.isPending}>
              Invite staff
            </button>
          ) : null
        }
        filters={
          <>
            <TextFilter label="Name or email" value={filters.search} onChange={(v) => setFilter({ search: v })} />
            <SelectFilter
              label="Status"
              value={filters.status}
              onChange={(v) => setFilter({ status: v })}
              options={STAFF_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
            />
            <SelectFilter
              label="Role"
              value={filters.role}
              onChange={(v) => setFilter({ role: v })}
              options={roleList.map((r) => ({ value: r.key, label: r.name }))}
            />
          </>
        }
      />
      <Modal open={dialog?.kind === "invite"} onClose={() => setDialog(null)} title="Invite staff">
        <InviteDialog roles={roleList} onDone={done} />
      </Modal>
      <Modal open={dialog?.kind === "role"} onClose={() => setDialog(null)} title={dialog?.kind === "role" ? `Change role for ${dialog.member.name}` : "Change role"}>
        {dialog?.kind === "role" ? <RoleDialog member={dialog.member} roles={roleList} onDone={done} /> : null}
      </Modal>
      <Modal open={dialog?.kind === "deactivate"} onClose={() => setDialog(null)} title={dialog?.kind === "deactivate" ? `Deactivate ${dialog.member.name}` : "Deactivate"}>
        {dialog?.kind === "deactivate" ? <DeactivateDialog member={dialog.member} onDone={done} /> : null}
      </Modal>
      <Modal open={dialog?.kind === "reissue"} onClose={() => setDialog(null)} title={dialog?.kind === "reissue" ? `Send ${dialog.member.name} a new invitation` : "Send invitation again"}>
        {dialog?.kind === "reissue" ? <ReissueDialog member={dialog.member} onDone={done} /> : null}
      </Modal>
      <Modal open={dialog?.kind === "reset"} onClose={() => setDialog(null)} title={dialog?.kind === "reset" ? `Reset credentials for ${dialog.member.name}` : "Reset credentials"}>
        {dialog?.kind === "reset" ? <ResetDialog member={dialog.member} onDone={done} /> : null}
      </Modal>
    </>
  );
}

function MySessions() {
  const { data, isPending, isError, error } = useSessions();
  const { revokeSession } = useStaffMutations();
  return (
    <section aria-label="Your sessions" className="mt-10">
      <h2 className="mb-1 text-lg font-semibold">Your sessions</h2>
      <p className="mb-3 text-sm text-muted">Where you are signed in. End any you don&apos;t recognise.</p>
      {isPending ? (
        <ListSkeleton label="Loading your sessions…" rows={3} />
      ) : isError ? (
        <NoticePanel title="Could not load your sessions">{errorMessage(error)}</NoticePanel>
      ) : (
        <>
          {revokeSession.isError ? (
            <div className="mb-3">
              <FormError>{errorMessage(revokeSession.error)}</FormError>
            </div>
          ) : null}
          <ul className="divide-y divide-line rounded-card border border-line bg-card shadow-card">
            {data.map((s) => {
              const device = describeDevice(s.userAgent);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div>
                    <p className="font-medium text-ink">
                      {device}
                      {s.current ? <span className="ml-2 text-xs font-normal text-muted">This device</span> : null}
                    </p>
                    <p className="text-sm text-muted">
                      {s.ipAddress ?? "Address not recorded"} · signed in <TimeCell value={s.createdAt} /> · last seen{" "}
                      <TimeCell value={s.lastSeenAt} />
                      {s.mfaCompleted ? "" : " · sign-in not completed"}
                    </p>
                  </div>
                  {s.current ? null : (
                    <button
                      type="button"
                      className={smallButton}
                      aria-label={`End session on ${device}`}
                      aria-disabled={revokeSession.isPending}
                      onClick={() => !revokeSession.isPending && revokeSession.mutate(s.id)}
                    >
                      End session
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export function StaffPage() {
  return (
    <>
      <PageHeader
        title="Staff"
        description="Who can use this console, and what they can do. Every change here is recorded with its reason."
      />
      <RequirePermission permission={ADMIN_PERMISSION.STAFF_VIEW}>
        <StaffTabs />
        <Members />
        <MySessions />
      </RequirePermission>
    </>
  );
}
