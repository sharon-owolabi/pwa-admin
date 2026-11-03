import createClient from "openapi-fetch";
import { ADMIN_API_URL } from "@/shared/lib/env";
import type { paths } from "./admin-contract";
import type { AuthAdapter, Outcome } from "./auth-adapter";
import type { Approval, ApiErrorBody, InvitedMember, StaffMember } from "./contract";
import { ApiError } from "./errors";
import type { ReadApi } from "./read-api";

/** Fired when an authenticated call comes back 401 (session expired or revoked). */
export const UNAUTHORIZED_EVENT = "fusion-admin:unauthorized";

/**
 * The only place that talks HTTP to the admin API. Typed by the generated
 * contract (admin-contract.ts); when `@solab-tech/fusion-admin-sdk` is
 * published this becomes `createAdminClient`. Cookie session, never the product
 * SDK client.
 */
const client = createClient<paths>({ baseUrl: ADMIN_API_URL, credentials: "include" });

client.use({
  onResponse({ request, response }) {
    if (response.status !== 401) return;
    const { pathname } = new URL(request.url);
    // Sign-in and MFA answer 401 for a wrong password or code: that is the
    // form's to show. `/me` is excluded too: the gate reads its own error, and
    // re-firing on its refetch after the cache is cleared would loop.
    if (pathname.startsWith("/v1/admin/auth/") || pathname === "/v1/admin/me") return;
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  },
});

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiErrorBody).error?.message === "string"
  );
}

function toApiError(error: unknown, status: number): ApiError {
  if (isErrorBody(error)) {
    const e = error.error;
    return new ApiError(e.code, e.message, e.statusCode ?? status, e.details);
  }
  return new ApiError("request_failed", "The request failed. Try again.", status);
}

/** The response body's `data`, or a thrown ApiError carrying the API's own message. */
function unwrap<R extends { data?: { data: unknown }; error?: unknown; response: Response }>(
  res: R,
): NonNullable<R["data"]>["data"] {
  if (res.error !== undefined || !res.data) throw toApiError(res.error, res.response.status);
  return res.data.data as NonNullable<R["data"]>["data"];
}

/** 202 is an approval request, not the change itself. */
function outcome<T>(res: {
  data?: { data: unknown };
  error?: unknown;
  response: Response;
}): Outcome<T> {
  const data = unwrap(res);
  return res.response.status === 202
    ? { status: "pending_approval", approval: data as Approval }
    : { status: "done", value: data as T };
}

const paged = <Q extends { cursor?: string | null }>(q: Q) => ({
  ...q,
  cursor: q.cursor ?? undefined,
});

export const httpReadApi: ReadApi = {
  async me() {
    return unwrap(await client.GET("/v1/admin/me"));
  },
  async sessions() {
    return unwrap(await client.GET("/v1/admin/me/sessions"));
  },
  async overview() {
    return unwrap(await client.GET("/v1/admin/overview"));
  },
  async tenants(q) {
    return unwrap(await client.GET("/v1/admin/tenants", { params: { query: paged(q) } }));
  },
  async tenant(id) {
    return unwrap(await client.GET("/v1/admin/tenants/{id}", { params: { path: { id } } }));
  },
  async connectors() {
    return unwrap(await client.GET("/v1/admin/connectors"));
  },
  async runs(q) {
    return unwrap(await client.GET("/v1/admin/ingestion/runs", { params: { query: paged(q) } }));
  },
  async run(id) {
    return unwrap(await client.GET("/v1/admin/ingestion/runs/{id}", { params: { path: { id } } }));
  },
  async mapping(q) {
    return unwrap(await client.GET("/v1/admin/quality/mapping", { params: { query: paged(q) } }));
  },
  async audit(q) {
    return unwrap(await client.GET("/v1/admin/audit-events", { params: { query: paged(q) } }));
  },
  async staff(q) {
    return unwrap(await client.GET("/v1/admin/staff", { params: { query: paged(q) } }));
  },
  async roles() {
    return unwrap(await client.GET("/v1/admin/staff/roles"));
  },
  async approvals(q) {
    return unwrap(await client.GET("/v1/admin/staff/approvals", { params: { query: paged(q) } }));
  },
};

export const httpAuthAdapter: AuthAdapter = {
  async signIn(body) {
    return unwrap(await client.POST("/v1/admin/auth/sign-in", { body }));
  },
  async verifyMfa(body) {
    return unwrap(await client.POST("/v1/admin/auth/mfa/verify", { body }));
  },
  async signOut() {
    unwrap(await client.POST("/v1/admin/auth/sign-out"));
  },
  async acceptInvite(body) {
    return unwrap(await client.POST("/v1/admin/auth/invitations/accept", { body }));
  },
  async revokeSession({ sessionId }) {
    unwrap(
      await client.POST("/v1/admin/me/sessions/{id}/revoke", { params: { path: { id: sessionId } } }),
    );
  },
  async inviteStaff(body) {
    return outcome<InvitedMember>(await client.POST("/v1/admin/staff/invitations", { body }));
  },
  async changeRole({ staffId, roleKey, reason }) {
    return outcome<StaffMember>(
      await client.PATCH("/v1/admin/staff/{id}/role", {
        params: { path: { id: staffId } },
        body: { roleKey, reason },
      }),
    );
  },
  async deactivateStaff({ staffId, reason }) {
    return unwrap(
      await client.POST("/v1/admin/staff/{id}/deactivate", {
        params: { path: { id: staffId } },
        body: { reason },
      }),
    );
  },
  async reissueInvitation({ staffId, reason }) {
    return unwrap(
      await client.POST("/v1/admin/staff/{id}/reissue-invitation", {
        params: { path: { id: staffId } },
        body: { reason },
      }),
    );
  },
  async resetCredentials({ staffId, reason }) {
    return unwrap(
      await client.POST("/v1/admin/staff/{id}/reset-credentials", {
        params: { path: { id: staffId } },
        body: { reason },
      }),
    );
  },
  async approve({ approvalId, reason }) {
    return unwrap(
      await client.POST("/v1/admin/staff/approvals/{id}/approve", {
        params: { path: { id: approvalId } },
        body: { reason },
      }),
    );
  },
  async reject({ approvalId, reason }) {
    return unwrap(
      await client.POST("/v1/admin/staff/approvals/{id}/reject", {
        params: { path: { id: approvalId } },
        body: { reason },
      }),
    );
  },
  async cancel({ approvalId }) {
    return unwrap(
      await client.POST("/v1/admin/staff/approvals/{id}/cancel", {
        params: { path: { id: approvalId } },
      }),
    );
  },
};
