import type {
  AuditEvent,
  Connector,
  MappingRun,
  Me,
  StaffMember,
  SyncRun,
  TenantConnection,
  TenantRow,
} from "../contract.draft";
import { ADMIN_PERMISSION } from "../permissions";

/**
 * Typed fixtures for the mock adapter. They obey the console's guardrails:
 * business names only, no people, no secrets, no row-level data. They include
 * empty, failing and stale cases, an unknown status and a non-launch gateway
 * (which the UI must hide), so those paths are exercised.
 */

/** Fixed "now" so the data is the same on every load. */
export const NOW = Date.parse("2026-10-30T09:00:00.000Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

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

const COUNTRIES = [
  ["NG", "NGN"], ["NG", "NGN"], ["NG", "NGN"], ["GH", "GHS"], ["KE", "KES"], ["ZA", "ZAR"],
] as const;

export const TENANTS: TenantRow[] = NAMES.map((name, i) => {
  const [country, reportingCurrency] = pick(COUNTRIES);
  const created = NOW - between(5, 420) * DAY;
  const stale = i % 9 === 4;
  return {
    id: `ws_${(1000 + i * 37).toString(36)}${(i * 7919).toString(36)}`,
    name,
    country,
    reportingCurrency,
    createdAt: iso(created),
    memberCount: between(1, 9),
    connectionCount: i % 11 === 3 ? 0 : between(1, 3),
    lastSyncedAt: i % 11 === 3 ? null : iso(NOW - (stale ? between(3, 9) * DAY : between(1, 300) * 60_000)),
    lastActivityAt: i % 13 === 5 ? null : iso(NOW - between(1, 72) * HOUR),
  };
});

const GATEWAYS = ["paystack", "flutterwave", "interswitch"] as const;
const CONN_STATUSES = ["active", "active", "active", "backfilling", "degraded", "error", "paused", "revoked", "connecting"];

export const CONNECTIONS: Record<string, TenantConnection[]> = {};
TENANTS.forEach((tenant, ti) => {
  CONNECTIONS[tenant.id] = Array.from({ length: tenant.connectionCount }, (_, ci) => {
    const gateway = ti === 6 && ci === 0 ? "monnify" : GATEWAYS[(ti + ci) % 3]!;
    const status = ti === 12 && ci === 0 ? "pending_review" : pick(CONN_STATUSES);
    const revoked = status === "revoked";
    return {
      id: `conn_${ti}_${ci}`,
      gateway,
      label: ci === 0 ? "Main account" : `Account ${ci + 1}`,
      status,
      polling: status === "active" || status === "backfilling" || status === "degraded",
      webhooksReceiving: status === "active" && rand() > 0.2,
      lastSyncedAt: status === "connecting" ? null : iso(NOW - between(2, 600) * 60_000),
      recordsIngestedToday: status === "active" ? between(0, 2400) : 0,
      backfillDepth: status === "backfilling" ? `${between(10, 90)} days` : ci === 1 ? null : "365 days",
      revokedAt: revoked ? iso(NOW - between(1, 40) * DAY) : null,
    };
  });
});

export const TRANSACTION_STATUSES = ["succeeded", "failed", "pending", "reversed"] as const;

export function transactionCounts(tenantId: string) {
  const out: { gateway: string; status: string; count: number }[] = [];
  for (const c of CONNECTIONS[tenantId] ?? []) {
    if (c.status === "connecting") continue;
    for (const status of TRANSACTION_STATUSES) {
      out.push({ gateway: c.gateway, status, count: between(0, status === "succeeded" ? 9000 : 400) });
    }
  }
  return out;
}

export const CONNECTORS: Connector[] = [
  {
    gateway: "paystack",
    tenantsEnabled: 0,
    connectionsByStatus: {},
    runOutcomes: { succeeded: 412, failed: 9, running: 3, cancelled: 2 },
    lastSyncedAt: iso(NOW - 4 * 60_000),
    adapterVersion: "paystack-2.14.0",
    rateLimitHits: 17,
    circuitState: "closed",
  },
  {
    gateway: "flutterwave",
    tenantsEnabled: 0,
    connectionsByStatus: {},
    runOutcomes: { succeeded: 233, failed: 31, running: 1, cancelled: 0 },
    lastSyncedAt: iso(NOW - 3 * HOUR),
    adapterVersion: "flutterwave-1.9.2",
    rateLimitHits: null,
    circuitState: "half_open",
  },
  {
    gateway: "interswitch",
    tenantsEnabled: 0,
    connectionsByStatus: {},
    runOutcomes: { succeeded: 88, failed: 2, running: 0, cancelled: 1 },
    lastSyncedAt: iso(NOW - 26 * HOUR),
    adapterVersion: null,
    rateLimitHits: null,
    circuitState: null,
  },
];
for (const connector of CONNECTORS) {
  const conns = Object.values(CONNECTIONS)
    .flat()
    .filter((c) => c.gateway === connector.gateway);
  connector.tenantsEnabled = new Set(
    Object.entries(CONNECTIONS)
      .filter(([, list]) => list.some((c) => c.gateway === connector.gateway))
      .map(([id]) => id),
  ).size;
  for (const c of conns) {
    connector.connectionsByStatus[c.status] = (connector.connectionsByStatus[c.status] ?? 0) + 1;
  }
}

const RESOURCES = ["transactions", "customers", "settlements", "refunds"] as const;
const ERROR_CATEGORIES = ["rate_limited", "auth_failed", "upstream_unavailable", "timeout", "schema_changed"] as const;

export const RUNS: SyncRun[] = [];
const allConnections = Object.entries(CONNECTIONS).flatMap(([workspaceId, list]) =>
  list.map((c) => ({ workspaceId, c })),
);
for (let i = 0; i < 140; i++) {
  const { workspaceId, c } = allConnections[i % allConnections.length]!;
  const roll = rand();
  const status = i < 3 ? "running" : roll < 0.78 ? "succeeded" : roll < 0.93 ? "failed" : "cancelled";
  const started = NOW - (i * 47 + between(1, 40)) * 60_000;
  const finished = status === "running" ? null : started + between(8, 400) * 1000;
  const fetched = status === "failed" ? between(0, 120) : between(20, 3000);
  RUNS.push({
    id: `run_${(100_000 + i * 17).toString(36)}`,
    workspaceId,
    connectionId: c.id,
    gateway: c.gateway,
    resource: pick(RESOURCES),
    mode: i % 5 === 0 ? "backfill" : "incremental",
    status,
    recordsFetched: fetched,
    recordsNew: status === "failed" ? null : Math.floor(fetched * rand()),
    pages: Math.max(1, Math.ceil(fetched / 100)),
    connectorVersion: i % 7 === 0 ? null : `${c.gateway}-1.${between(0, 9)}.${between(0, 3)}`,
    startedAt: iso(started),
    finishedAt: finished ? iso(finished) : null,
    errorCategory: status === "failed" ? pick(ERROR_CATEGORIES) : null,
  });
}

export const MAPPING_RUNS: MappingRun[] = Array.from({ length: 60 }, (_, i) => {
  const { workspaceId, c } = allConnections[(i * 3) % allConnections.length]!;
  const read = between(200, 5000);
  const failed = i % 4 === 0 ? between(1, 60) : 0;
  const warned = i % 3 === 0 ? between(1, 90) : 0;
  const started = NOW - (i * 71 + 5) * 60_000;
  return {
    id: `map_${(200_000 + i * 13).toString(36)}`,
    workspaceId,
    connectionId: c.id,
    connector: c.gateway,
    resource: pick(RESOURCES),
    mappingVersion: pick(["v3.2.0", "v3.2.1", "v3.3.0"]),
    status: failed > 0 ? "failed" : warned > 0 ? "warned" : "succeeded",
    recordsRead: read,
    recordsMapped: read - failed,
    recordsFailed: failed,
    recordsWarned: warned,
    failureCount: failed > 0 ? between(1, 5) : 0,
    startedAt: iso(started),
    finishedAt: iso(started + between(5, 90) * 1000),
  };
});

const ACTORS = ["Ada Okafor", "Sam Mensah", "Ines Duarte", "System"] as const;
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
  return {
    id: `aud_${(300_000 + i * 11).toString(36)}`,
    scope,
    actorLabel: scope === "tenant" && i % 2 ? "Merchant member" : ACTORS[i % ACTORS.length]!,
    action,
    targetType,
    targetId: tenant ? `conn_${i % 12}_0` : `staff_${(i % 4) + 1}`,
    workspaceId: tenant?.id ?? null,
    // Deliberately present, to prove the UI never renders it (Q6).
    metadata: { note: "fixture metadata the console must not show" },
    createdAt: iso(NOW - (i * 53 + 7) * 60_000),
  };
});

export const ROLES = [
  { key: "super_admin", name: "Super Admin" },
  { key: "platform_ops", name: "Platform Ops" },
  { key: "support", name: "Support" },
  { key: "finance", name: "Finance" },
  { key: "data_ai", name: "Data/AI" },
  { key: "security", name: "Security" },
  { key: "executive", name: "Executive" },
] as const;

const P = ADMIN_PERMISSION;
const ALL = Object.values(P);
const READ_ONLY = [P.OVERVIEW_VIEW, P.TENANTS_VIEW, P.CONNECTORS_VIEW, P.RUNS_VIEW, P.QUALITY_VIEW];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [...ALL],
  platform_ops: [...READ_ONLY, P.AUDIT_VIEW, P.STAFF_VIEW],
  support: [P.OVERVIEW_VIEW, P.TENANTS_VIEW, P.RUNS_VIEW],
  finance: [P.OVERVIEW_VIEW, P.TENANTS_VIEW],
  data_ai: [...READ_ONLY],
  security: [...READ_ONLY, P.AUDIT_VIEW, P.STAFF_VIEW],
  executive: [P.OVERVIEW_VIEW],
};

/** Staff who can sign in to the mock. Password `password`, code `123456`. */
export const STAFF_SEED: (StaffMember & { password: string })[] = [
  { id: "staff_1", email: "ada@fusion.test", name: "Ada Okafor", role: ROLES[0], status: "active", lastSignInAt: iso(NOW - 2 * HOUR), pendingElevation: null, password: "password" },
  { id: "staff_2", email: "sam@fusion.test", name: "Sam Mensah", role: ROLES[2], status: "active", lastSignInAt: iso(NOW - 26 * HOUR), pendingElevation: null, password: "password" },
  { id: "staff_3", email: "ines@fusion.test", name: "Ines Duarte", role: ROLES[1], status: "active", lastSignInAt: iso(NOW - 3 * DAY), pendingElevation: { toRole: "Super Admin" }, password: "password" },
  { id: "staff_4", email: "kofi@fusion.test", name: "Kofi Asante", role: ROLES[6], status: "invited", lastSignInAt: null, pendingElevation: null, password: "password" },
  { id: "staff_5", email: "locked@fusion.test", name: "Locked Example", role: ROLES[3], status: "active", lastSignInAt: null, pendingElevation: null, password: "password" },
  { id: "staff_6", email: "lena@fusion.test", name: "Lena Vogt", role: ROLES[4], status: "deactivated", lastSignInAt: iso(NOW - 60 * DAY), pendingElevation: null, password: "password" },
];

export function meFor(staff: StaffMember): Me {
  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    permissions: ROLE_PERMISSIONS[staff.role.key] ?? [],
    mfaEnrolled: true,
  };
}
