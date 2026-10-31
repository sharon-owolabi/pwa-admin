"use client";

import { useState, type FormEvent } from "react";
import type { StaffMember, StaffSession } from "@/shared/api/contract.draft";
import { errorMessage } from "@/shared/api/errors";
import { useSessions, useStaff, useStaffMutations } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import { Field, FormError } from "@/shared/components/field";
import { Modal } from "@/shared/components/modal";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { ListSkeleton } from "@/shared/components/skeleton";
import { Select } from "@/shared/components/select";
import { StatusBadge } from "@/shared/components/status-badge";
import {
  dangerButton,
  inputClass,
  outlineButton,
  primaryButton,
  smallButton,
} from "@/shared/components/styles";
import { TimeCell } from "@/shared/components/time-cell";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { useCurrentStaff } from "@/modules/auth/components/auth-gate";
import { useCan } from "@/modules/auth/hooks/use-can";

type Dialog =
  | { kind: "invite" }
  | { kind: "role"; member: StaffMember }
  | { kind: "deactivate"; member: StaffMember }
  | null;

const MIN_REASON = 3;

function RoleSelect({
  roles,
  value,
  onChange,
  id,
}: {
  roles: { key: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
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

function InviteDialog({ roles, onDone }: { roles: { key: string; name: string }[]; onDone: (msg: string) => void }) {
  const { invite } = useStaffMutations();
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && roleKey !== "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || invite.isPending) return;
    try {
      await invite.mutateAsync({ email: email.trim(), roleKey });
      onDone(`Invitation sent to ${email.trim()}.`);
    } catch {
      // Shown below from invite.error.
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {invite.isError ? <FormError>{errorMessage(invite.error)}</FormError> : null}
      <Field label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      <div>
        <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-ink">Role</label>
        <RoleSelect id="invite-role" roles={roles} value={roleKey} onChange={setRoleKey} />
      </div>
      <button type="submit" className={primaryButton} disabled={!valid || invite.isPending}>
        {invite.isPending ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}

function ReasonField({ value, onChange, label = "Reason" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <Field
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      hint="Recorded in the audit log."
      error={value !== "" && value.trim().length < MIN_REASON ? "Say a little more." : null}
    />
  );
}

function RoleDialog({
  member,
  roles,
  onDone,
}: {
  member: StaffMember;
  roles: { key: string; name: string }[];
  onDone: (msg: string) => void;
}) {
  const { changeRole } = useStaffMutations();
  const [roleKey, setRoleKey] = useState("");
  const [reason, setReason] = useState("");
  const valid = roleKey !== "" && roleKey !== member.role.key && reason.trim().length >= MIN_REASON;
  const elevating = roleKey === "super_admin";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || changeRole.isPending) return;
    try {
      const result = await changeRole.mutateAsync({ staffId: member.id, roleKey, reason: reason.trim() });
      onDone(
        result.status === "pending_approval"
          ? `${member.name} is waiting for a second approver before becoming Super Admin.`
          : `${member.name}'s role was changed.`,
      );
    } catch {
      // Shown below.
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">
        {member.name} is currently <strong className="text-ink">{member.role.name}</strong>.
      </p>
      {changeRole.isError ? <FormError>{errorMessage(changeRole.error)}</FormError> : null}
      <div>
        <label htmlFor="new-role" className="mb-1 block text-sm font-medium text-ink">New role</label>
        <RoleSelect id="new-role" roles={roles.filter((r) => r.key !== member.role.key)} value={roleKey} onChange={setRoleKey} />
        {elevating ? (
          <p className="mt-1 text-xs text-muted">Super Admin needs a second approver. The change waits until they approve.</p>
        ) : null}
      </div>
      <ReasonField value={reason} onChange={setReason} />
      <button type="submit" className={primaryButton} disabled={!valid || changeRole.isPending}>
        {changeRole.isPending ? "Saving…" : elevating ? "Request elevation" : "Change role"}
      </button>
    </form>
  );
}

function DeactivateDialog({ member, onDone }: { member: StaffMember; onDone: (msg: string) => void }) {
  const { deactivate } = useStaffMutations();
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= MIN_REASON;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || deactivate.isPending) return;
    try {
      await deactivate.mutateAsync({ staffId: member.id, reason: reason.trim() });
      onDone(`${member.name} was deactivated.`);
    } catch {
      // Shown below.
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">
        {member.name} will lose access to the console straight away, and their sessions end.
      </p>
      {deactivate.isError ? <FormError>{errorMessage(deactivate.error)}</FormError> : null}
      <ReasonField value={reason} onChange={setReason} />
      <button type="submit" className={dangerButton} disabled={!valid || deactivate.isPending}>
        {deactivate.isPending ? "Deactivating…" : "Deactivate"}
      </button>
    </form>
  );
}

function StaffList() {
  const me = useCurrentStaff();
  const canInvite = useCan(ADMIN_PERMISSION.STAFF_INVITE);
  const canChange = useCan(ADMIN_PERMISSION.STAFF_CHANGE_ROLE);
  const canDeactivate = useCan(ADMIN_PERMISSION.STAFF_DEACTIVATE);
  const { data, isPending, isError, error, refetch } = useStaff(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const done = (message: string) => {
    setNotice(message);
    setDialog(null);
  };

  if (isPending) return <ListSkeleton label="Loading staff…" rows={4} />;
  if (isError) {
    return (
      <NoticePanel
        title="Could not load staff"
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

  return (
    <section aria-label="Staff">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Staff</h2>
        {canInvite ? (
          <button type="button" className={primaryButton} onClick={() => setDialog({ kind: "invite" })}>
            Invite staff
          </button>
        ) : null}
      </div>
      {notice ? (
        <p role="status" className="mb-3 rounded-input bg-ok-soft px-3 py-2 text-sm text-ok-ink">
          {notice}
        </p>
      ) : null}
      <ul className="divide-y divide-line rounded-card border border-line bg-card shadow-card">
        {data.items.map((m) => {
          const self = m.id === me.id;
          const live = m.status !== "deactivated";
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {m.name}
                  {self ? <span className="ml-2 text-xs font-normal text-muted">You</span> : null}
                </p>
                <p className="truncate text-sm text-muted">{m.email}</p>
                {m.pendingElevation ? (
                  <p className="mt-1 text-xs text-signal-ink">
                    Waiting for a second approver to become {m.pendingElevation.toRole}.
                  </p>
                ) : null}
              </div>
              <p className="text-sm text-ink-2">{m.role.name}</p>
              <StatusBadge status={m.status} />
              <p className="w-28 text-sm text-muted">
                <TimeCell value={m.lastSignInAt} />
              </p>
              <div className="flex gap-2">
                {canChange && !self && m.status === "active" ? (
                  <button type="button" className={smallButton} onClick={() => setDialog({ kind: "role", member: m })}>
                    Change role
                  </button>
                ) : null}
                {canDeactivate && !self && live ? (
                  <button type="button" className={smallButton} onClick={() => setDialog({ kind: "deactivate", member: m })}>
                    Deactivate
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Modal open={dialog?.kind === "invite"} onClose={() => setDialog(null)} title="Invite staff">
        <InviteDialog roles={data.roles} onDone={done} />
      </Modal>
      <Modal
        open={dialog?.kind === "role"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "role" ? `Change role for ${dialog.member.name}` : "Change role"}
      >
        {dialog?.kind === "role" ? <RoleDialog member={dialog.member} roles={data.roles} onDone={done} /> : null}
      </Modal>
      <Modal
        open={dialog?.kind === "deactivate"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "deactivate" ? `Deactivate ${dialog.member.name}` : "Deactivate"}
      >
        {dialog?.kind === "deactivate" ? <DeactivateDialog member={dialog.member} onDone={done} /> : null}
      </Modal>
    </section>
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
          {revokeSession.isError ? <div className="mb-3"><FormError>{errorMessage(revokeSession.error)}</FormError></div> : null}
          <ul className="divide-y divide-line rounded-card border border-line bg-card shadow-card">
            {data.map((s: StaffSession) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div>
                  <p className="font-medium text-ink">
                    {s.device}
                    {s.current ? <span className="ml-2 text-xs font-normal text-muted">This device</span> : null}
                  </p>
                  <p className="text-sm text-muted">
                    Last active <TimeCell value={s.lastActiveAt} />
                  </p>
                </div>
                {s.current ? null : (
                  <button
                    type="button"
                    className={smallButton}
                    aria-label={`End session on ${s.device}`}
                    aria-disabled={revokeSession.isPending}
                    onClick={() => !revokeSession.isPending && revokeSession.mutate(s.id)}
                  >
                    End session
                  </button>
                )}
              </li>
            ))}
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
        <StaffList />
        <MySessions />
      </RequirePermission>
    </>
  );
}
