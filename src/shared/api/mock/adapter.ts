import type { AuthAdapter, Outcome } from "../auth-adapter";
import type { Approval, InvitedMember, StaffMember } from "../contract";
import { ApiError } from "../errors";
import { UNAUTHORIZED_EVENT } from "../http-adapter";
import { ADMIN_PERMISSION as P, can, type AdminPermission } from "../permissions";
import type { ReadApi } from "../read-api";
import {
  APPROVALS_SEED,
  AUDIT_EVENTS,
  CONNECTIONS,
  CONNECTORS,
  DATA_UP_TO,
  MAPPING_RUNS,
  NOW,
  ROLES,
  RUNS,
  SESSIONS_SEED,
  STAFF_SEED,
  TENANTS,
  meFor,
  permissionsOf,
  roleOf,
  transactionCounts,
  uuid,
} from "./fixtures";
import { filterKeyOf, paginate } from "./paginate";

/**
 * The mock behaves like the real admin API where the console can tell: the
 * two-step sign-in with a pending cookie, 202 approval requests, the refusals
 * (own role, last Super Admin, deciding your own request) and per-route
 * permissions. Nothing is stored beyond the signed-in staff id in sessionStorage.
 */
const LATENCY_MS = 220;
const SESSION_KEY = "fusion-admin-mock-session";
const wait = () => new Promise<void>((r) => setTimeout(r, LATENCY_MS));

type Seeded = StaffMember & { password: string };
let staff: Seeded[] = STAFF_SEED.map((s) => ({ ...s }));
let approvals: Approval[] = APPROVALS_SEED.map((a) => ({ ...a }));
let sessions = SESSIONS_SEED.map((s) => ({ ...s }));
let pendingMfa: string | null = null;
let memorySession: string | null = null;
let counter = 100;

const strip = ({ password: _password, ...member }: Seeded): StaffMember => member;

function readSession(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
function writeSession(id: string | null): void {
  try {
    if (id) window.sessionStorage.setItem(SESSION_KEY, id);
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Not persisted; the session holds for this page view only.
  }
}
const currentId = () => memorySession ?? readSession();

function signedIn(): Seeded {
  const member = staff.find((s) => s.id === currentId());
  if (!member || member.status !== "active") {
    throw new ApiError("unauthorized", "Sign in to continue.", 401);
  }
  return member;
}

/** An authenticated route: 401 tells the gate (like the HTTP adapter), 403 when the role lacks it. */
function guard(permission?: AdminPermission): Seeded {
  let member: Seeded;
  try {
    member = signedIn();
  } catch (e) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw e;
  }
  if (permission && !can(permissionsOf(member.role.key), permission)) {
    throw new ApiError("forbidden", "Your role does not include this.", 403);
  }
  return member;
}

function startSession(member: Seeded) {
  memorySession = member.id;
  writeSession(member.id);
  member.lastLoginAt = new Date().toISOString();
  return meFor(member);
}

const includes = (haystack: string, needle?: string) =>
  !needle || haystack.toLowerCase().includes(needle.trim().toLowerCase());
const inRange = (iso: string, from?: string, to?: string) => (!from || iso >= from) && (!to || iso < to);
const dayStart = (d?: string) => (d ? `${d}T00:00:00.000Z` : undefined);
const dayAfter = (d?: string) => {
  if (!d) return undefined;
  const next = new Date(`${d}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
};

export const mockReadApi: ReadApi = {
  async me() {
    await wait();
    return meFor(signedIn());
  },

  async sessions() {
    await wait();
    const me = guard();
    const own = sessions.filter((s) => s.staffId === me.id);
    return (own.length ? own : [{ ...sessions[0]!, id: uuid(8, 99), staffId: me.id }]).map(
      ({ staffId: _staffId, ...s }) => s,
    );
  },

  async overview() {
    await wait();
    guard(P.OVERVIEW_VIEW);
    const day = RUNS.filter((r) => Date.parse(r.startedAt) > NOW - 24 * 3_600_000);
    const count = (s: string) => day.filter((r) => r.status === s).length;
    return {
      dataUpTo: DATA_UP_TO,
      tenants: { total: TENANTS.length },
      connectionsByGateway: CONNECTORS.map((c) => ({
        gateway: c.gateway,
        total: Object.values(c.connections).reduce((a, b) => a + b, 0),
        byStatus: c.connections,
      })),
      syncHealth: {
        windowHours: 24,
        running: count("running"),
        succeeded: count("succeeded"),
        failed: count("failed"),
        cancelled: count("cancelled"),
      },
      recentAudit: AUDIT_EVENTS.slice(0, 5),
      notAvailable: ["plans", "billing", "trials", "cost", "feature_flags"],
    };
  },

  async tenants(query) {
    await wait();
    guard(P.TENANTS_VIEW);
    const rows = TENANTS.filter((t) => {
      const conns = CONNECTIONS[t.id] ?? [];
      return (
        (includes(t.name, query.search) || includes(t.id, query.search)) &&
        (!query.gateway || conns.some((c) => c.gateway === query.gateway)) &&
        (!query.connectionStatus || conns.some((c) => c.status === query.connectionStatus)) &&
        inRange(t.createdAt, dayStart(query.joinedFrom), dayAfter(query.joinedTo))
      );
    });
    const sort = query.sort ?? "-createdAt";
    const dir = sort.startsWith("-") ? -1 : 1;
    const field = sort.replace(/^-/, "") as "name" | "createdAt" | "lastSyncedAt" | "lastActivityAt";
    const sorted = [...rows].sort((a, b) => {
      const av = a[field] ?? "";
      const bv = b[field] ?? "";
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return paginate(sorted, query, filterKeyOf(query), DATA_UP_TO);
  },

  async tenant(id) {
    await wait();
    guard(P.TENANTS_VIEW);
    const tenant = TENANTS.find((t) => t.id === id);
    if (!tenant) throw new ApiError("not_found", "That merchant does not exist.", 404);
    return {
      ...tenant,
      dataUpTo: DATA_UP_TO,
      connections: CONNECTIONS[id] ?? [],
      transactionCounts: transactionCounts(id),
    };
  },

  async connectors() {
    await wait();
    guard(P.CONNECTORS_VIEW);
    return CONNECTORS;
  },

  async runs(query) {
    await wait();
    guard(P.CONNECTORS_VIEW);
    const rows = RUNS.filter(
      (r) =>
        (!query.tenantId || r.workspaceId === query.tenantId) &&
        (!query.gateway || r.gateway === query.gateway) &&
        (!query.status || r.status === query.status) &&
        inRange(r.startedAt, query.from, query.to),
    );
    return paginate(rows, query, filterKeyOf(query), DATA_UP_TO);
  },

  async run(id) {
    await wait();
    guard(P.CONNECTORS_VIEW);
    const run = RUNS.find((r) => r.id === id);
    if (!run) throw new ApiError("not_found", "That sync run does not exist.", 404);
    return run;
  },

  async mapping(query) {
    await wait();
    guard(P.CONNECTORS_VIEW);
    const rows = MAPPING_RUNS.filter(
      (r) =>
        (!query.tenantId || r.workspaceId === query.tenantId) &&
        (!query.gateway || r.connector === query.gateway) &&
        (query.mappingVersion === undefined || r.mappingVersion === query.mappingVersion) &&
        (!query.status || r.status === query.status),
    );
    return paginate(rows, query, filterKeyOf(query), DATA_UP_TO);
  },

  async audit(query) {
    await wait();
    guard(P.AUDIT_VIEW);
    const rows = AUDIT_EVENTS.filter(
      (e) =>
        includes(e.actorLabel ?? "", query.actor) &&
        includes(e.action, query.action) &&
        (!query.target || includes(`${e.targetType ?? ""} ${e.targetId ?? ""}`, query.target)) &&
        (!query.tenantId || e.workspaceId === query.tenantId) &&
        (!query.scope || e.scope === query.scope) &&
        inRange(e.createdAt, query.from, query.to),
    );
    return paginate(rows, query, filterKeyOf(query), DATA_UP_TO);
  },

  async staff(query) {
    await wait();
    guard(P.STAFF_VIEW);
    const rows = staff
      .filter(
        (s) =>
          (!query.status || s.status === query.status) &&
          (!query.role || s.role.key === query.role) &&
          (includes(s.name, query.search) || includes(s.email, query.search)),
      )
      .map(strip);
    return paginate(rows, query, filterKeyOf(query), new Date().toISOString());
  },

  async roles() {
    await wait();
    guard(P.STAFF_VIEW);
    return ROLES;
  },

  async approvals(query) {
    await wait();
    guard(P.STAFF_VIEW);
    const rows = approvals.filter((a) => !query.status || a.status === query.status);
    return paginate(rows, query, filterKeyOf(query), new Date().toISOString());
  },
};

const OK_TOKEN = /^ok[-_a-z0-9]*$/i;
const PRIVILEGED = new Set(["super_admin", "security"]);
const reasonOk = (reason: string) => {
  if (reason.trim().length < 3) throw new ApiError("validation_error", "A reason is required.", 400);
};
const nextId = (ns: number) => uuid(ns, ++counter);
const lastSuperAdmin = (target: Seeded) =>
  target.role.key === "super_admin" &&
  target.status === "active" &&
  staff.filter((s) => s.role.key === "super_admin" && s.status === "active").length === 1;

function newApproval(
  action: string,
  requester: Seeded,
  reason: string,
  target: Seeded | null,
  payload: Record<string, unknown>,
): Approval {
  const approval: Approval = {
    id: nextId(7),
    action,
    targetType: target ? "staff" : null,
    targetId: target?.id ?? null,
    reason,
    status: "pending",
    payload,
    requestedBy: { id: requester.id, name: requester.name },
    decidedBy: null,
    createdAt: new Date().toISOString(),
    decidedAt: null,
    expiresAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
  };
  approvals = [approval, ...approvals];
  return approval;
}

function addInvited(email: string, name: string, roleKey: string): Seeded {
  const member: Seeded = {
    id: nextId(6),
    email,
    name,
    role: roleOf(roleKey),
    status: "invited",
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    password: "password",
  };
  staff = [...staff, member];
  return member;
}

const withEmail = (member: Seeded): InvitedMember => ({
  ...strip(member),
  emailSent: !member.email.includes("noemail"),
});

function pendingFor(member: Seeded, action: string): Approval | undefined {
  return approvals.find((a) => a.status === "pending" && a.targetId === member.id && a.action === action);
}

function decide(id: string, to: "approved" | "rejected", reason?: string): Approval {
  const me = guard(P.STAFF_APPROVE);
  const request = approvals.find((a) => a.id === id);
  if (!request) throw new ApiError("not_found", "That request does not exist.", 404);
  if (request.status !== "pending") {
    throw new ApiError("conflict", `That request was already ${request.status}.`, 409);
  }
  if (request.requestedBy.id === me.id) {
    throw new ApiError("forbidden", "You cannot decide your own request.", 403);
  }
  if (to === "approved") {
    const payload = (request.payload ?? {}) as { roleKey?: string; email?: string; name?: string };
    if (request.action === "staff.role_elevation") {
      const target = staff.find((s) => s.id === request.targetId);
      if (target && payload.roleKey) target.role = roleOf(payload.roleKey);
    } else if (request.action === "staff.invite_privileged" && payload.email && payload.roleKey) {
      addInvited(payload.email, payload.name ?? payload.email, payload.roleKey);
    }
  }
  const decided: Approval = {
    ...request,
    status: to,
    decidedBy: { id: me.id, name: me.name },
    decidedAt: new Date().toISOString(),
    reason: reason?.trim() ? `${request.reason} · ${reason.trim()}` : request.reason,
  };
  approvals = approvals.map((a) => (a.id === id ? decided : a));
  return decided;
}

export const mockAuthAdapter: AuthAdapter = {
  async signIn({ email, password }) {
    await wait();
    const member = staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
    if (member?.email === "locked@fusion.test") {
      throw new ApiError("too_many_requests", "Too many attempts. Try again in 15 minutes.", 429);
    }
    // One answer for unknown user, wrong password and deactivated, on purpose.
    if (!member || member.password !== password || member.status !== "active") {
      throw new ApiError("invalid_credentials", "That email and password do not match.", 401);
    }
    pendingMfa = member.id;
    return { mfaRequired: true, mfaEnrolled: true };
  },

  async verifyMfa({ code }) {
    await wait();
    const member = staff.find((s) => s.id === pendingMfa);
    if (!member) throw new ApiError("unauthorized", "Start sign-in again.", 401);
    if (code !== "123456") throw new ApiError("invalid_code", "That code is not right.", 401);
    pendingMfa = null;
    member.status = "active";
    return startSession(member);
  },

  async signOut() {
    await wait();
    memorySession = null;
    pendingMfa = null;
    writeSession(null);
    return;
  },

  async acceptInvite({ token, name, password }) {
    await wait();
    if (!OK_TOKEN.test(token)) {
      throw new ApiError("invitation_invalid", "This invitation has expired or was already used.", 401);
    }
    if (password.length < 12) throw new ApiError("validation_error", "Use at least 12 characters.", 400);
    const member = staff.find((s) => s.status === "invited") ?? addInvited("new@fusion.test", name, "support");
    member.name = name;
    member.password = password;
    pendingMfa = member.id;
    return {
      otpauthUrl: `otpauth://totp/Fusion%20Admin:${member.email}?secret=JBSWY3DPEHPK3PXP&issuer=Fusion%20Admin`,
      manualKey: "JBSW Y3DP EHPK 3PXP",
    };
  },

  async revokeSession({ sessionId }) {
    await wait();
    guard();
    if (sessions.find((s) => s.id === sessionId)?.current) {
      throw new ApiError("conflict", "Sign out to end this session.", 409);
    }
    sessions = sessions.filter((s) => s.id !== sessionId);
  },

  async inviteStaff({ email, name, roleKey, reason }) {
    await wait();
    const me = guard(P.STAFF_MANAGE);
    reasonOk(reason);
    if (!ROLES.some((r) => r.key === roleKey)) throw new ApiError("unknown_role", "Choose a valid role.", 422);
    if (staff.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError("staff_exists", "That person is already on the staff list.", 409);
    }
    if (PRIVILEGED.has(roleKey)) {
      return {
        status: "pending_approval",
        approval: newApproval("staff.invite_privileged", me, reason, null, { email, name, roleKey }),
      } satisfies Outcome<InvitedMember>;
    }
    return { status: "done", value: withEmail(addInvited(email, name, roleKey)) } satisfies Outcome<InvitedMember>;
  },

  async changeRole({ staffId, roleKey, reason }) {
    await wait();
    const me = guard(P.STAFF_MANAGE);
    reasonOk(reason);
    const target = staff.find((s) => s.id === staffId);
    if (!target) throw new ApiError("not_found", "That staff member does not exist.", 404);
    if (target.id === me.id) throw new ApiError("cannot_change_own_role", "You cannot change your own role.", 403);
    if (!ROLES.some((r) => r.key === roleKey)) throw new ApiError("unknown_role", "Choose a valid role.", 422);
    if (target.role.key === roleKey) throw new ApiError("role_unchanged", "They already have that role.", 409);
    if (lastSuperAdmin(target)) {
      throw new ApiError("last_super_admin", "There must always be one active Super Admin.", 409);
    }
    if (roleKey === "super_admin") {
      if (pendingFor(target, "staff.role_elevation")) {
        throw new ApiError("approval_pending", "A request for this person is already waiting.", 409);
      }
      return {
        status: "pending_approval",
        approval: newApproval("staff.role_elevation", me, reason, target, { roleKey }),
      } satisfies Outcome<StaffMember>;
    }
    target.role = roleOf(roleKey);
    return { status: "done", value: strip(target) } satisfies Outcome<StaffMember>;
  },

  async deactivateStaff({ staffId, reason }) {
    await wait();
    const me = guard(P.STAFF_MANAGE);
    reasonOk(reason);
    const target = staff.find((s) => s.id === staffId);
    if (!target) throw new ApiError("not_found", "That staff member does not exist.", 404);
    if (target.id === me.id) throw new ApiError("cannot_deactivate_self", "You cannot deactivate yourself.", 403);
    if (lastSuperAdmin(target)) {
      throw new ApiError("last_super_admin", "There must always be one active Super Admin.", 409);
    }
    target.status = "deactivated";
    return strip(target);
  },

  async reissueInvitation({ staffId, reason }) {
    await wait();
    guard(P.STAFF_MANAGE);
    reasonOk(reason);
    const target = staff.find((s) => s.id === staffId);
    if (!target) throw new ApiError("not_found", "That staff member does not exist.", 404);
    if (target.status !== "invited") {
      throw new ApiError("invitation_invalid", "Only a pending invitation can be sent again.", 422);
    }
    return withEmail(target);
  },

  async resetCredentials({ staffId, reason }) {
    await wait();
    const me = guard(P.STAFF_MANAGE);
    reasonOk(reason);
    const target = staff.find((s) => s.id === staffId);
    if (!target) throw new ApiError("not_found", "That staff member does not exist.", 404);
    if (target.id === me.id) throw new ApiError("cannot_reset_self", "You cannot reset your own credentials.", 403);
    if (target.status === "deactivated") throw new ApiError("invitation_invalid", "They are deactivated.", 422);
    target.status = "invited";
    return withEmail(target);
  },

  async approve({ approvalId, reason }) {
    await wait();
    return decide(approvalId, "approved", reason);
  },

  async reject({ approvalId, reason }) {
    await wait();
    return decide(approvalId, "rejected", reason);
  },

  async cancel({ approvalId }) {
    await wait();
    const me = guard(P.STAFF_MANAGE);
    const request = approvals.find((a) => a.id === approvalId);
    if (!request) throw new ApiError("not_found", "That request does not exist.", 404);
    if (request.requestedBy.id !== me.id) {
      throw new ApiError("forbidden", "Only the person who asked can withdraw it.", 403);
    }
    if (request.status !== "pending") {
      throw new ApiError("conflict", `That request was already ${request.status}.`, 409);
    }
    const cancelled: Approval = { ...request, status: "cancelled", decidedAt: new Date().toISOString() };
    approvals = approvals.map((a) => (a.id === approvalId ? cancelled : a));
    return cancelled;
  },
};
