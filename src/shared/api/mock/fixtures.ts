import type {
  Approval,
  AuditEvent,
  Connector,
  MappingRun,
  Me,
  StaffMember,
  StaffRole,
  StaffSession,
  SyncRun,
  TenantConnection,
  TenantRow,
} from "../contract";
import { ADMIN_PERMISSION as P, type AdminPermission } from "../permissions";

/**
 * Typed fixtures for the mock adapter (NEXT_PUBLIC_ADMIN_MOCK=on). Typed by the
 * generated contract, so a contract change breaks the build here. They obey the
 * console's guardrails: business names only, no merchant people, no secrets, no
 * row-level data. They include empty, failing and stale cases.
 */

/** Fixed "now" so the data is the same on every load. */
export const NOW = Date.parse("2026-10-30T09:00:00.000Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

/** A stable, valid-looking UUID from a namespace and an index. */
export function uuid(ns: number, n: number): string {
  const h = (v: number, len: number) => v.toString(16).padStart(len, "0").slice(-len);
  return `${h(ns, 8)}-${h(n, 4)}-4${h(n * 7 + ns, 3)}-8${h(n * 13 + ns, 3)}-${h(ns * 31 + n, 12)}`;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return s / 4_294_967_296;
  };
}
const rand = rng(20261030);
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

export const DATA_UP_TO = iso(NOW - 6 * 60_000);

const NAMES = [
  "Ade & Sons Provisions", "Bluepeak Logistics", "Cascade Learning", "Dune Coffee Roasters",
  "Eko Fresh Market", "Fairway Pharmacy", "Greenleaf Organics", "Harbour Freight Co",
  "Ibadan Print Works", "Jara Mobile Repairs", "Kano Textile Hub", "Lagos Bike Share",
  "Mango Street Kitchen", "Nile Cloud Services", "Ogun Farm Direct", "Pearl Hotels",
  "Quartz Studios", "Rivet Hardware", "Sahara Travel", "Tidal Pay Services",
  "Umbra Apparel", "Vista Opticals", "Wale Auto Parts", "Xenon Gadgets",
  "Yellow Door Bakery", "Zenith Tutors", "Atlas Courier", "Baobab Spa",
  "Cedar Home Goods", "Delta Water Co", "Ember Grill", "Foundry Fitness",
  "Gala Events", "Hive Coworking", "Iroko Furniture", "Juno Beauty",
  "Kite Digital", "Lumen Solar", "Mesa Books", "Nova Telecom Reseller",
  "Orchid Florists", "Prism Photography",
] as const;

const PLACES = [
  ["NG", "NGN", "Africa/Lagos"], ["NG", "NGN", "Africa/Lagos"], ["NG", "NGN", "Africa/Lagos"],
  ["GH", "GHS", "Africa/Accra"], ["KE", "KES", "Africa/Nairobi"], ["ZA", "ZAR", "Africa/Johannesburg"],
] as const;

export const TENANTS: TenantRow[] = NAMES.map((name, i) => {
  const [country, reportingCurrency, timezone] = pick(PLACES);
  const stale = i % 9 === 4;
  const none = i % 11 === 3;
  return {
    id: uuid(1, i),
    name,
    country,
    reportingCurrency,
    timezone,
    organisationId: uuid(2, i),
    createdAt: iso(NOW - between(5, 420) * DAY),
    memberCount: between(1, 9),
    connectionCount: none ? 0 : between(1, 3),
    lastSyncedAt: none ? null : iso(NOW - (stale ? between(3, 9) * DAY : between(1, 300) * 60_000)),
    lastActivityAt: i % 13 === 5 ? null : iso(NOW - between(1, 72) * HOUR),
  };
});

const GATEWAYS = ["paystack", "flutterwave", "interswitch"] as const;
const CONN_STATUSES = [
  "active", "active", "active", "backfilling", "degraded", "error", "paused", "revoked", "connecting",
] as const;

export const CONNECTIONS: Record<string, TenantConnection[]> = {};
TENANTS.forEach((tenant, ti) => {
  CONNECTIONS[tenant.id] = Array.from({ length: tenant.connectionCount }, (_, ci) => {
    const status = pick(CONN_STATUSES);
    return {
      id: uuid(3, ti * 4 + ci),
      workspaceId: tenant.id,
      gateway: GATEWAYS[(ti + ci) % 3]!,
      label: ci === 0 ? "Main account" : `Account ${ci + 1}`,
      status,
      polling: status === "active" || status === "backfilling" || status === "degraded",
      webhooksReceiving: status === "active" && rand() > 0.2,
      lastSyncedAt: status === "connecting" ? null : iso(NOW - between(2, 600) * 60_000),
      recordsIngestedToday: status === "active" ? between(0, 2400) : 0,
      revokedAt: status === "revoked" ? iso(NOW - between(1, 40) * DAY) : null,
      backfillDepth: status === "backfilling" ? `${between(10, 90)} days` : ci === 1 ? null : "365 days",
      createdAt: iso(NOW - between(5, 300) * DAY),
    };
  });
});

export const TRANSACTION_STATUSES = ["succeeded", "failed", "pending", "reversed", "abandoned", "unknown"] as const;

export function transactionCounts(tenantId: string) {
  const out: { gateway: (typeof GATEWAYS)[number]; status: string; count: number }[] = [];
  for (const c of CONNECTIONS[tenantId] ?? []) {
    if (c.status === "connecting") continue;
    for (const status of TRANSACTION_STATUSES) {
      out.push({ gateway: c.gateway, status, count: between(0, status === "succeeded" ? 9000 : 400) });
    }
  }
  return out;
}

const EMPTY_STATUS = { connecting: 0, backfilling: 0, active: 0, degraded: 0, error: 0, paused: 0, revoked: 0 };

const RUN_OUTCOMES: Record<(typeof GATEWAYS)[number], Connector["runs24h"]> = {
  paystack: { running: 3, succeeded: 412, failed: 9, cancelled: 2 },
  flutterwave: { running: 1, succeeded: 233, failed: 31, cancelled: 0 },
  interswitch: { running: 0, succeeded: 88, failed: 2, cancelled: 1 },
};
const LAST_SYNC = {
  paystack: iso(NOW - 4 * 60_000),
  flutterwave: iso(NOW - 3 * HOUR),
  interswitch: iso(NOW - 26 * HOUR),
};

/** Fields the platform does not record yet are null, as the API sends them. */
export const CONNECTORS: Connector[] = GATEWAYS.map((gateway) => {
  const conns = Object.values(CONNECTIONS).flat().filter((c) => c.gateway === gateway);
  const connections = { ...EMPTY_STATUS };
  for (const c of conns) connections[c.status] += 1;
  return {
    gateway,
    tenantsEnabled: new Set(conns.map((c) => c.workspaceId)).size,
    connections,
    runs24h: RUN_OUTCOMES[gateway],
    lastSyncedAt: LAST_SYNC[gateway],
    adapterVersion: null,
    rateLimitHits: null,
    circuitState: null,
    dataUpTo: DATA_UP_TO,
  };
});

const RESOURCES = ["transactions", "customers", "settlements", "refunds"] as const;
const ERROR_CATEGORIES = [
  "auth_failed", "rate_limited", "upstream_error", "connection_unavailable",
  "credentials_unreadable", "enqueue_failed", "internal_error", "interrupted", "unknown",
] as const;

const allConnections = Object.values(CONNECTIONS).flat();

export const RUNS: SyncRun[] = Array.from({ length: 140 }, (_, i) => {
  const c = allConnections[i % allConnections.length]!;
  const roll = rand();
  const status = i < 3 ? "running" : roll < 0.78 ? "succeeded" : roll < 0.93 ? "failed" : "cancelled";
  const started = NOW - (i * 47 + between(1, 40)) * 60_000;
  const fetched = status === "failed" ? between(0, 120) : between(20, 3000);
  return {
    id: uuid(4, i),
    workspaceId: c.workspaceId,
    connectionId: c.id,
    gateway: c.gateway,
    resource: pick(RESOURCES),
    mode: i % 5 === 0 ? "backfill" : i % 7 === 0 ? "webhook" : "incremental",
    status,
    recordsFetched: fetched,
    recordsNew: status === "failed" ? null : Math.floor(fetched * rand()),
    pages: Math.max(1, Math.ceil(fetched / 100)),
    connectorVersion: i % 7 === 0 ? null : `${c.gateway}-1.${between(0, 9)}.${between(0, 3)}`,
    startedAt: iso(started),
    finishedAt: status === "running" ? null : iso(started + between(8, 400) * 1000),
    errorCategory: status === "failed" ? pick(ERROR_CATEGORIES) : null,
  };
});

export const MAPPING_RUNS: MappingRun[] = Array.from({ length: 60 }, (_, i) => {
  const c = allConnections[(i * 3) % allConnections.length]!;
  const read = between(200, 5000);
  const failed = i % 4 === 0 ? between(1, 60) : 0;
  const started = NOW - (i * 71 + 5) * 60_000;
  return {
    id: uuid(5, i),
    workspaceId: c.workspaceId,
    connectionId: c.id,
    gateway: i % 17 === 0 ? null : c.gateway,
    connector: c.gateway,
    resource: pick(RESOURCES),
    mappingVersion: pick([3, 4, 5]),
    mode: i % 6 === 0 ? "manual" : "auto",
    status: i < 2 ? "running" : failed > 0 ? "failed" : "succeeded",
    recordsRead: read,
    recordsMapped: read - failed,
    recordsFailed: failed,
    recordsWarned: i % 3 === 0 ? between(1, 90) : 0,
    failureCount: failed > 0 ? between(1, 5) : 0,
    startedAt: iso(started),
    finishedAt: i < 2 ? null : iso(started + between(5, 90) * 1000),
  };
});

export const ROLES: StaffRole[] = [
  { key: "super_admin", name: "Super Admin", description: "Policy, staff and emergency response", permissions: [P.OVERVIEW_VIEW, P.TENANTS_VIEW, P.AUDIT_VIEW, P.CONNECTORS_VIEW, P.STAFF_VIEW, P.STAFF_MANAGE, P.STAFF_APPROVE] },
  { key: "platform_ops", name: "Platform Ops", description: "Connector reliability, ingestion and data quality", permissions: [P.OVERVIEW_VIEW, P.TENANTS_VIEW, P.AUDIT_VIEW, P.CONNECTORS_VIEW] },
  { key: "support", name: "Support", description: "Tenant status and troubleshooting, metadata only", permissions: [P.OVERVIEW_VIEW, P.TENANTS_VIEW, P.AUDIT_VIEW, P.CONNECTORS_VIEW] },
  { key: "finance", name: "Finance", description: "Commercial metadata (billing arrives with its data)", permissions: [P.OVERVIEW_VIEW, P.TENANTS_VIEW, P.AUDIT_VIEW] },
  { key: "data_ai", name: "Data / AI", description: "Data quality and pipeline health", permissions: [P.OVERVIEW_VIEW, P.TENANTS_VIEW, P.AUDIT_VIEW, P.CONNECTORS_VIEW] },
  { key: "security", name: "Security", description: "Access reviews, audit and approvals", permissions: [P.OVERVIEW_VIEW, P.TENANTS_VIEW, P.AUDIT_VIEW, P.CONNECTORS_VIEW, P.STAFF_VIEW, P.STAFF_APPROVE] },
  { key: "executive", name: "Executive", description: "Aggregated dashboards only", permissions: [P.OVERVIEW_VIEW, P.AUDIT_VIEW] },
];

export const roleOf = (key: string): { key: string; name: string } => {
  const r = ROLES.find((x) => x.key === key) ?? ROLES[0]!;
  return { key: r.key, name: r.name };
};
export const permissionsOf = (key: string): AdminPermission[] =>
  (ROLES.find((r) => r.key === key)?.permissions ?? []) as AdminPermission[];

/** Staff who can sign in to the mock. Password `password`, code `123456`. */
export const STAFF_SEED: (StaffMember & { password: string })[] = [
  { id: uuid(6, 1), email: "ada@fusion.test", name: "Ada Okafor", role: roleOf("super_admin"), status: "active", lastLoginAt: iso(NOW - 2 * HOUR), createdAt: iso(NOW - 200 * DAY), password: "password" },
  { id: uuid(6, 2), email: "sam@fusion.test", name: "Sam Mensah", role: roleOf("support"), status: "active", lastLoginAt: iso(NOW - 26 * HOUR), createdAt: iso(NOW - 120 * DAY), password: "password" },
  { id: uuid(6, 3), email: "ines@fusion.test", name: "Ines Duarte", role: roleOf("security"), status: "active", lastLoginAt: iso(NOW - 3 * DAY), createdAt: iso(NOW - 90 * DAY), password: "password" },
  { id: uuid(6, 4), email: "kofi@fusion.test", name: "Kofi Asante", role: roleOf("executive"), status: "invited", lastLoginAt: null, createdAt: iso(NOW - 2 * DAY), password: "password" },
  { id: uuid(6, 5), email: "locked@fusion.test", name: "Locked Example", role: roleOf("finance"), status: "active", lastLoginAt: null, createdAt: iso(NOW - 60 * DAY), password: "password" },
  { id: uuid(6, 6), email: "lena@fusion.test", name: "Lena Vogt", role: roleOf("data_ai"), status: "deactivated", lastLoginAt: iso(NOW - 60 * DAY), createdAt: iso(NOW - 300 * DAY), password: "password" },
];

/** Ines's elevation request, waiting for a Super Admin who is not Ines. */
export const APPROVALS_SEED: Approval[] = [
  {
    id: uuid(7, 1),
    action: "staff.role_elevation",
    targetType: "staff",
    targetId: STAFF_SEED[1]!.id,
    reason: "Covering platform policy while Ada is away",
    status: "pending",
    payload: { roleKey: "super_admin" },
    requestedBy: { id: STAFF_SEED[2]!.id, name: "Ines Duarte" },
    decidedBy: null,
    createdAt: iso(NOW - 5 * HOUR),
    decidedAt: null,
    expiresAt: iso(NOW + 43 * HOUR),
  },
  {
    id: uuid(7, 2),
    action: "staff.invite_privileged",
    targetType: null,
    targetId: null,
    reason: "New head of security",
    status: "approved",
    payload: { email: "noor@fusion.test", name: "Noor Haddad", roleKey: "security" },
    requestedBy: { id: STAFF_SEED[0]!.id, name: "Ada Okafor" },
    decidedBy: { id: STAFF_SEED[2]!.id, name: "Ines Duarte" },
    createdAt: iso(NOW - 6 * DAY),
    decidedAt: iso(NOW - 6 * DAY + HOUR),
    expiresAt: iso(NOW - 4 * DAY),
  },
];

export const SESSIONS_SEED: (StaffSession & { staffId: string })[] = [
  { id: uuid(8, 1), staffId: STAFF_SEED[0]!.id, createdAt: iso(NOW - 3 * HOUR), lastSeenAt: iso(NOW - 60_000), ipAddress: "102.89.12.7", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", current: true, mfaCompleted: true },
  { id: uuid(8, 2), staffId: STAFF_SEED[0]!.id, createdAt: iso(NOW - 2 * DAY), lastSeenAt: iso(NOW - 20 * HOUR), ipAddress: "197.210.3.44", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", current: false, mfaCompleted: true },
  { id: uuid(8, 3), staffId: STAFF_SEED[0]!.id, createdAt: iso(NOW - 9 * DAY), lastSeenAt: iso(NOW - 6 * DAY), ipAddress: null, userAgent: null, current: false, mfaCompleted: false },
];

const ACTORS = [
  [STAFF_SEED[0]!.id, "Ada Okafor"], [STAFF_SEED[1]!.id, "Sam Mensah"], [STAFF_SEED[2]!.id, "Ines Duarte"], [null, null],
] as const;
const ACTIONS = [
  ["platform", "staff.signed_in", "staff", null],
  ["platform", "staff.invited", "staff", null],
  ["platform", "staff.role_changed", "staff", null],
  ["platform", "audit.read", "audit", null],
  ["tenant", "connection.paused", "connection", "ws"],
  ["tenant", "connection.revoked", "connection", "ws"],
  ["tenant", "member.removed", "member", "ws"],
  ["tenant", "connection.created", "connection", "ws"],
] as const;

export const AUDIT_EVENTS: AuditEvent[] = Array.from({ length: 80 }, (_, i) => {
  const [scope, action, targetType, ws] = ACTIONS[i % ACTIONS.length]!;
  const tenant = ws ? TENANTS[(i * 5) % TENANTS.length]! : null;
  const [actorId, actorLabel] = ACTORS[i % ACTORS.length]!;
  return {
    id: uuid(9, i),
    scope,
    actorId,
    actorLabel,
    action,
    targetType,
    targetId: tenant ? uuid(3, i % 12) : STAFF_SEED[i % 4]!.id,
    workspaceId: tenant?.id ?? null,
    reason: scope === "platform" && i % 3 === 0 ? "Quarterly access review" : null,
    correlationId: i % 2 ? uuid(10, i) : null,
    createdAt: iso(NOW - (i * 53 + 7) * 60_000),
  };
});

export function meFor(staff: StaffMember): Me {
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    permissions: permissionsOf(staff.role.key),
    mfaEnrolled: true,
    lastLoginAt: staff.lastLoginAt,
  };
}
