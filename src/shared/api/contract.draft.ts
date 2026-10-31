/**
 * DRAFT admin API contract.
 *
 * `@solab-tech/fusion-admin-sdk` is not published yet, so these types are
 * written by hand from the Admin Portal plan. This file is the single,
 * documented exception to "never hand-roll a type from the API" (CLAUDE.md).
 * It is DELETED when the SDK lands; module types then derive from
 * `operations[...]` like apps/app does. Every type here is DRAFT.
 *
 * Nullable means "Not recorded" in the UI, never 0 or blank. Statuses are
 * lowercase snake_case strings; unknown values render as a neutral pill.
 */

/** DRAFT */
export interface ApiErrorBody {
  error: { code: string; message: string; statusCode: number; details?: unknown };
}

/** DRAFT */
export interface Page<T> {
  items: T[];
  /** null is the last page. There is no total count. */
  nextCursor: string | null;
  dataUpTo: string | null;
}

/** DRAFT */
export interface Me {
  id: string;
  email: string;
  name: string;
  role: { key: string; name: string };
  permissions: string[];
  mfaEnrolled: boolean;
}

/** DRAFT */
export interface AuditEvent {
  id: string;
  scope: "platform" | "tenant";
  actorLabel: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  workspaceId: string | null;
  /** Never rendered raw until the API confirms it holds no merchant content (Q6). */
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** DRAFT */
export interface Overview {
  dataUpTo: string | null;
  tenants: { total: number };
  connectionsByGateway: { gateway: string; total: number; byStatus: Record<string, number> }[];
  syncHealth: {
    succeeded: number;
    failed: number;
    running: number;
    cancelled: number;
    windowHours: number;
  };
  recentAudit: AuditEvent[];
}

/** DRAFT */
export interface TenantRow {
  id: string;
  name: string;
  country: string;
  reportingCurrency: string;
  createdAt: string;
  memberCount: number;
  connectionCount: number;
  lastSyncedAt: string | null;
  lastActivityAt: string | null;
}

/** DRAFT */
export interface TenantConnection {
  id: string;
  gateway: string;
  label: string;
  status: string;
  polling: boolean;
  webhooksReceiving: boolean;
  lastSyncedAt: string | null;
  recordsIngestedToday: number;
  backfillDepth: string | null;
  revokedAt: string | null;
}

/** DRAFT */
export interface TenantDetail extends TenantRow {
  connections: TenantConnection[];
  transactionCounts: { gateway: string; status: string; count: number }[];
  dataUpTo: string | null;
}

/** DRAFT */
export interface Connector {
  gateway: string;
  tenantsEnabled: number;
  connectionsByStatus: Record<string, number>;
  runOutcomes: Record<string, number>;
  lastSyncedAt: string | null;
  adapterVersion: string | null;
  rateLimitHits: number | null;
  circuitState: string | null;
}

/** DRAFT */
export interface ConnectorsResponse {
  items: Connector[];
  dataUpTo: string | null;
}

/** DRAFT */
export interface SyncRun {
  id: string;
  workspaceId: string;
  connectionId: string;
  gateway: string;
  resource: string;
  mode: string;
  status: string;
  recordsFetched: number;
  recordsNew: number | null;
  pages: number;
  connectorVersion: string | null;
  startedAt: string;
  finishedAt: string | null;
  /** A category only; never a raw error or checkpoint. */
  errorCategory: string | null;
}

/** DRAFT */
export interface MappingRun {
  id: string;
  workspaceId: string;
  connectionId: string;
  connector: string;
  resource: string;
  mappingVersion: string;
  status: string;
  recordsRead: number;
  recordsMapped: number;
  recordsFailed: number;
  recordsWarned: number;
  failureCount: number;
  startedAt: string;
  finishedAt: string | null;
}

/** DRAFT: the list queries. Values are strings as they sit in the URL. */
export interface ListQuery {
  cursor?: string | null;
  limit?: number;
}
export interface TenantQuery extends ListQuery {
  search?: string;
  gateway?: string;
  connectionStatus?: string;
  joinedFrom?: string;
  joinedTo?: string;
  sort?: string;
}
export interface RunQuery extends ListQuery {
  tenantId?: string;
  gateway?: string;
  status?: string;
  from?: string;
  to?: string;
}
export interface MappingQuery extends ListQuery {
  tenantId?: string;
  gateway?: string;
  mappingVersion?: string;
  status?: string;
}
export interface AuditQuery extends ListQuery {
  actor?: string;
  action?: string;
  target?: string;
  tenantId?: string;
  scope?: string;
  from?: string;
  to?: string;
}

/* ---- Write side: NOT drafted by the API team yet (Q1, Q7). This is the UI's
   own narrow interface; see auth-adapter.ts. ---- */

/** DRAFT */
export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: { key: string; name: string };
  status: "active" | "invited" | "deactivated";
  lastSignInAt: string | null;
  /** Elevation to Super Admin waits for a second approver. */
  pendingElevation: { toRole: string } | null;
}

/** DRAFT */
export interface StaffList {
  items: StaffMember[];
  roles: { key: string; name: string }[];
}

/** DRAFT */
export interface StaffSession {
  id: string;
  device: string;
  lastActiveAt: string;
  current: boolean;
}

/** DRAFT */
export interface TotpEnrolment {
  enrolmentId: string;
  /** otpauth:// URI the QR code is drawn from. */
  otpauthUri: string;
  /** The same secret, for typing by hand. */
  manualKey: string;
}
