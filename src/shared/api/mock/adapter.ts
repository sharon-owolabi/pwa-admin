import type {
  AuditEvent,
  Me,
  StaffList,
  StaffMember,
  StaffSession,
} from "../contract.draft";
import type { AuthAdapter } from "../auth-adapter";
import { ApiError } from "../errors";
import { UNAUTHORIZED_EVENT } from "../http-adapter";
import type { ReadApi } from "../read-api";
import {
  AUDIT_EVENTS,
  CONNECTIONS,
  CONNECTORS,
  DATA_UP_TO,
  MAPPING_RUNS,
  NOW,
  ROLES,
  RUNS,
  STAFF_SEED,
  TENANTS,
  meFor,
  transactionCounts,
} from "./fixtures";
import { filterKeyOf, paginate } from "./paginate";

const LATENCY_MS = 220;
const SESSION_KEY = "fusion-admin-mock-session";
const wait = () => new Promise<void>((r) => setTimeout(r, LATENCY_MS));

/* Mock state lives in memory; only the signed-in staff id survives a reload
   (sessionStorage), so the gate can be exercised. No API data is stored. */
let staff: (StaffMember & { password: string })[] = STAFF_SEED.map((s) => ({ ...s }));
let sessions: StaffSession[] = [
  { id: "ses_1", device: "Chrome on macOS", lastActiveAt: new Date(NOW - 60_000).toISOString(), current: true },
  { id: "ses_2", device: "Safari on iPhone", lastActiveAt: new Date(NOW - 20 * 3_600_000).toISOString(), current: false },
  { id: "ses_3", device: "Firefox on Windows", lastActiveAt: new Date(NOW - 6 * 86_400_000).toISOString(), current: false },
];
const challenges = new Map<string, string>();
const enrolments = new Map<string, string>();
const appliedKeys = new Set<string>();

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
let memorySession: string | null = null;
const currentId = () => memorySession ?? readSession();

function unauthorized(): never {
  throw new ApiError("unauthorized", "Sign in to continue.", 401);
}
function current(): StaffMember {
  const member = staff.find((s) => s.id === currentId());
  if (!member || member.status !== "active") unauthorized();
  return member;
}
/** An authenticated call that finds no session tells the gate, like the HTTP adapter. */
function authed(): StaffMember {
  try {
    return current();
  } catch (e) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw e;
  }
}
function signInAs(member: StaffMember): Me {
  memorySession = member.id;
  writeSession(member.id);
  return meFor(member);
}

const inRange = (iso: string, from?: string, to?: string) =>
  (!from || iso >= from) && (!to || iso < to);
const includes = (haystack: string, needle?: string) =>
  !needle || haystack.toLowerCase().includes(needle.trim().toLowerCase());

export const mockReadApi: ReadApi = {
  async me() {
    await wait();
    return meFor(current());
  },

  async overview() {
    await wait();
    authed();
    const byGateway = new Map<string, Record<string, number>>();
    for (const list of Object.values(CONNECTIONS)) {
      for (const c of list) {
        const statuses = byGateway.get(c.gateway) ?? {};
        statuses[c.status] = (statuses[c.status] ?? 0) + 1;
        byGateway.set(c.gateway, statuses);
      }
    }
    const day = RUNS.filter((r) => Date.parse(r.startedAt) > NOW - 24 * 3_600_000);
    const count = (s: string) => day.filter((r) => r.status === s).length;
    return {
      dataUpTo: DATA_UP_TO,
      tenants: { total: TENANTS.length },
      connectionsByGateway: [...byGateway.entries()].map(([gateway, byStatus]) => ({
        gateway,
        total: Object.values(byStatus).reduce((a, b) => a + b, 0),
        byStatus,
      })),
      syncHealth: {
        succeeded: count("succeeded"),
        failed: count("failed"),
        running: count("running"),
        cancelled: count("cancelled"),
        windowHours: 24,
      },
      recentAudit: AUDIT_EVENTS.slice(0, 5),
    };
  },

  async tenants(query) {
    await wait();
    authed();
    let rows = TENANTS.filter((t) => {
      const conns = CONNECTIONS[t.id] ?? [];
      return (
        (includes(t.name, query.search) || includes(t.id, query.search)) &&
        (!query.gateway || conns.some((c) => c.gateway === query.gateway)) &&
        (!query.connectionStatus || conns.some((c) => c.status === query.connectionStatus)) &&
        inRange(t.createdAt, query.joinedFrom, query.joinedTo)
      );
    });
    const [field, dir] = (query.sort ?? "-createdAt").startsWith("-")
      ? [(query.sort ?? "-createdAt").slice(1), -1]
      : [query.sort ?? "createdAt", 1];
    rows = [...rows].sort((a, b) => {
      const av = field === "name" ? a.name : (field === "lastSyncedAt" ? a.lastSyncedAt : a.createdAt) ?? "";
      const bv = field === "name" ? b.name : (field === "lastSyncedAt" ? b.lastSyncedAt : b.createdAt) ?? "";
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return paginate(rows, query, filterKeyOf(query), DATA_UP_TO);
  },

  async tenant(id) {
    await wait();
    authed();
    const tenant = TENANTS.find((t) => t.id === id);
    if (!tenant) throw new ApiError("not_found", "That merchant does not exist.", 404);
    return {
      ...tenant,
      connections: CONNECTIONS[id] ?? [],
      transactionCounts: transactionCounts(id),
      dataUpTo: DATA_UP_TO,
    };
  },

  async connectors() {
    await wait();
    authed();
    return { items: CONNECTORS, dataUpTo: DATA_UP_TO };
  },

  async runs(query) {
    await wait();
    authed();
    const rows = RUNS.filter(
      (r) =>
        (!query.tenantId || r.workspaceId === query.tenantId || includes(r.workspaceId, query.tenantId)) &&
        (!query.gateway || r.gateway === query.gateway) &&
        (!query.status || r.status === query.status) &&
        inRange(r.startedAt, query.from, query.to),
    );
    return paginate(rows, query, filterKeyOf(query), DATA_UP_TO);
  },

  async run(id) {
    await wait();
    authed();
    const run = RUNS.find((r) => r.id === id);
    if (!run) throw new ApiError("not_found", "That sync run does not exist.", 404);
    return run;
  },

  async mapping(query) {
    await wait();
    authed();
    const rows = MAPPING_RUNS.filter(
      (r) =>
        (!query.tenantId || includes(r.workspaceId, query.tenantId)) &&
        (!query.gateway || r.connector === query.gateway) &&
        (!query.mappingVersion || r.mappingVersion === query.mappingVersion) &&
        (!query.status || r.status === query.status),
    );
    return paginate(rows, query, filterKeyOf(query), DATA_UP_TO);
  },

  async audit(query) {
    await wait();
    authed();
    const rows: AuditEvent[] = AUDIT_EVENTS.filter(
      (e) =>
        includes(e.actorLabel, query.actor) &&
        includes(e.action, query.action) &&
        (!query.target || includes(`${e.targetType ?? ""} ${e.targetId ?? ""}`, query.target)) &&
        (!query.tenantId || e.workspaceId === query.tenantId || includes(e.workspaceId ?? "", query.tenantId)) &&
        (!query.scope || e.scope === query.scope) &&
        inRange(e.createdAt, query.from, query.to),
    );
    return paginate(rows, query, filterKeyOf(query), DATA_UP_TO);
  },
};

const OK_TOKEN = /^ok[-_a-z0-9]*$/i;
const ROLE_NAMES = new Map<string, string>(ROLES.map((r) => [r.key, r.name]));

function seenKey(key: string) {
  // Replaying the same idempotency key is a no-op, like the API.
  if (appliedKeys.has(key)) return true;
  appliedKeys.add(key);
  return false;
}

export const mockAuthAdapter: AuthAdapter = {
  async signIn({ email, password }) {
    await wait();
    const member = staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
    if (member?.email === "locked@fusion.test") {
      throw new ApiError("account_locked", "Too many attempts. Try again in 15 minutes.", 429, {
        retryAfterSeconds: 900,
      });
    }
    if (!member || member.password !== password || member.status !== "active") {
      throw new ApiError("invalid_credentials", "That email and password do not match.", 401);
    }
    const challengeId = `chal_${Math.random().toString(36).slice(2)}`;
    challenges.set(challengeId, member.id);
    return { status: "mfa_required" as const, challengeId };
  },

  async verifyTotp({ challengeId, code }) {
    await wait();
    const id = challenges.get(challengeId);
    if (!id) throw new ApiError("challenge_expired", "That sign-in expired. Start again.", 401);
    if (code !== "123456") throw new ApiError("invalid_code", "That code is not right.", 401);
    challenges.delete(challengeId);
    const member = staff.find((s) => s.id === id)!;
    member.lastSignInAt = new Date().toISOString();
    return signInAs(member);
  },

  async signOut() {
    await wait();
    memorySession = null;
    writeSession(null);
  },

  async acceptInvite({ token, password }) {
    await wait();
    if (!OK_TOKEN.test(token)) {
      throw new ApiError("invite_invalid", "This invitation has expired or was already used.", 410);
    }
    if (password.length < 12) {
      throw new ApiError("weak_password", "Use at least 12 characters.", 400);
    }
    const enrolmentId = `enrol_${Math.random().toString(36).slice(2)}`;
    enrolments.set(enrolmentId, "staff_4");
    return {
      enrolment: {
        enrolmentId,
        otpauthUri: "otpauth://totp/Fusion%20Admin:kofi@fusion.test?secret=JBSWY3DPEHPK3PXP&issuer=Fusion%20Admin",
        manualKey: "JBSW Y3DP EHPK 3PXP",
      },
    };
  },

  async enrolTotp({ enrolmentId, code }) {
    await wait();
    const id = enrolments.get(enrolmentId);
    if (!id) throw new ApiError("enrolment_expired", "That setup expired. Open the link again.", 410);
    if (code !== "123456") throw new ApiError("invalid_code", "That code is not right.", 401);
    enrolments.delete(enrolmentId);
    const member = staff.find((s) => s.id === id)!;
    member.status = "active";
    return signInAs(member);
  },

  async listSessions() {
    await wait();
    authed();
    return sessions;
  },

  async revokeSession({ sessionId }) {
    await wait();
    authed();
    const target = sessions.find((s) => s.id === sessionId);
    if (target?.current) throw new ApiError("cannot_revoke_current", "Sign out to end this session.", 400);
    sessions = sessions.filter((s) => s.id !== sessionId);
  },

  async listStaff(): Promise<StaffList> {
    await wait();
    authed();
    return {
      items: staff.map(({ password: _password, ...rest }) => rest),
      roles: ROLES.map((r) => ({ ...r })),
    };
  },

  async inviteStaff({ email, roleKey, idempotencyKey }) {
    await wait();
    authed();
    if (seenKey(idempotencyKey)) return;
    if (staff.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError("already_exists", "That person is already on the staff list.", 409);
    }
    const name = ROLE_NAMES.get(roleKey);
    if (!name) throw new ApiError("validation_error", "Choose a role.", 400);
    staff = [
      ...staff,
      {
        id: `staff_${staff.length + 1}`,
        email,
        name: email.split("@")[0]!,
        role: { key: roleKey, name },
        status: "invited",
        lastSignInAt: null,
        pendingElevation: null,
        password: "password",
      },
    ];
  },

  async changeRole({ staffId, roleKey, reason, idempotencyKey }) {
    await wait();
    const me = authed();
    if (staffId === me.id) {
      throw new ApiError("cannot_change_own_role", "You cannot change your own role.", 403);
    }
    if (reason.trim().length < 3) throw new ApiError("validation_error", "A reason is required.", 400);
    const target = staff.find((s) => s.id === staffId);
    const name = ROLE_NAMES.get(roleKey);
    if (!target || !name) throw new ApiError("not_found", "That staff member does not exist.", 404);
    if (seenKey(idempotencyKey)) return { status: "changed" as const };
    if (roleKey === "super_admin") {
      target.pendingElevation = { toRole: name };
      return { status: "pending_approval" as const };
    }
    target.role = { key: roleKey, name };
    target.pendingElevation = null;
    return { status: "changed" as const };
  },

  async deactivateStaff({ staffId, reason, idempotencyKey }) {
    await wait();
    const me = authed();
    if (staffId === me.id) throw new ApiError("cannot_deactivate_self", "You cannot deactivate yourself.", 403);
    if (reason.trim().length < 3) throw new ApiError("validation_error", "A reason is required.", 400);
    if (seenKey(idempotencyKey)) return;
    const target = staff.find((s) => s.id === staffId);
    if (!target) throw new ApiError("not_found", "That staff member does not exist.", 404);
    target.status = "deactivated";
  },
};
