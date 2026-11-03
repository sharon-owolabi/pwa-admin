import type { operations } from "./admin-contract";

/**
 * Row and payload types, all DERIVED from the admin API's generated contract
 * (admin-contract.ts), never hand-written. A contract change breaks the build
 * here, in the mock fixtures and in the screens, instead of showing at runtime.
 */
type Json<R> = R extends { content: { "application/json": infer B } } ? B : never;
type Body<Op extends keyof operations, Code extends number = 200> = Json<
  operations[Op]["responses"][Code extends keyof operations[Op]["responses"] ? Code : never]
>;
type Data<Op extends keyof operations, Code extends number = 200> =
  Body<Op, Code> extends { data: infer D } ? D : never;
type Query<Op extends keyof operations> = operations[Op]["parameters"] extends {
  query?: infer Q;
}
  ? NonNullable<Q>
  : never;

export interface ApiErrorBody {
  error: { code: string; message: string; statusCode: number; details?: unknown };
}

export type Me = Data<"get_me">;
export type Overview = Data<"get_overview">;
export type AuditEvent = Overview["recentAudit"][number];
export type NotAvailable = Overview["notAvailable"][number];

export type TenantPage = Data<"get_tenants">;
export type TenantRow = TenantPage["items"][number];
export type TenantDetail = Data<"get_tenants_id">;
export type TenantConnection = TenantDetail["connections"][number];

export type Connector = Data<"get_connectors">[number];
export type SyncRun = Data<"get_ingestion_runs">["items"][number];
export type MappingRun = Data<"get_quality_mapping">["items"][number];

export type StaffMember = Data<"get_staff">["items"][number];
export type StaffRole = Data<"get_staff_roles">[number];
export type StaffSession = Data<"get_me_sessions">[number];
export type Approval = Data<"get_staff_approvals">["items"][number];

/** 201: the invited member, plus whether the email went out. 202: an approval request. */
export type InvitedMember = Data<"post_staff_invitations", 201>;
export type AcceptedInvite = Data<"post_auth_invitations_accept">;
export type SignInResult = Data<"post_auth_sign_in">;

export interface Page<T> {
  items: T[];
  /** null is the last page. There is no total count. */
  nextCursor: string | null;
  dataUpTo: string;
}

/** The list queries, minus paging (the hooks add `cursor` and `limit`). */
export type TenantQuery = Omit<Query<"get_tenants">, "cursor" | "limit">;
export type RunQuery = Omit<Query<"get_ingestion_runs">, "cursor" | "limit">;
export type MappingQuery = Omit<Query<"get_quality_mapping">, "cursor" | "limit">;
export type AuditQuery = Omit<Query<"get_audit_events">, "cursor" | "limit">;
export type StaffQuery = Omit<Query<"get_staff">, "cursor" | "limit">;
export type ApprovalQuery = Omit<Query<"get_staff_approvals">, "cursor" | "limit">;
export type Paging = { cursor?: string | null; limit?: number };

export type ConnectionStatus = TenantConnection["status"];
export type RunStatus = SyncRun["status"];
export type ErrorCategory = NonNullable<SyncRun["errorCategory"]>;
export type ApprovalStatus = Approval["status"];
