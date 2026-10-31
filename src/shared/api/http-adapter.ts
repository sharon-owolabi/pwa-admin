import { ADMIN_API_URL } from "@/shared/lib/env";
import { ApiError } from "./errors";
import type { ApiErrorBody } from "./contract.draft";
import type { AuthAdapter } from "./auth-adapter";
import type { ReadApi } from "./read-api";

/** Fired when an authenticated call comes back 401 (session expired or revoked). */
export const UNAUTHORIZED_EVENT = "fusion-admin:unauthorized";

function toSearch(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * The only place that talks HTTP to the admin API, until the typed SDK exists
 * (then this file is replaced by `$api`-style calls). Cookie session, never the
 * product SDK client.
 */
async function request<T>(path: string, query: object = {}): Promise<{ data: T }> {
  const res = await fetch(`${ADMIN_API_URL}/v1/admin${path}${toSearch(query)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    // `me` is excluded: the gate reads its own error, and re-firing on its refetch would loop.
    if (res.status === 401 && path !== "/me") window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error.code ?? "request_failed",
      body?.error.message ?? "The request failed.",
      res.status,
      body?.error.details,
    );
  }
  return (await res.json()) as { data: T };
}

export const httpReadApi: ReadApi = {
  me: async () => (await request<Awaited<ReturnType<ReadApi["me"]>>>("/me")).data,
  overview: async () => (await request<Awaited<ReturnType<ReadApi["overview"]>>>("/overview")).data,
  tenants: async (q) => (await request<Awaited<ReturnType<ReadApi["tenants"]>>>("/tenants", q)).data,
  tenant: async (id) =>
    (await request<Awaited<ReturnType<ReadApi["tenant"]>>>(`/tenants/${encodeURIComponent(id)}`)).data,
  connectors: async () =>
    (await request<Awaited<ReturnType<ReadApi["connectors"]>>>("/connectors")).data,
  runs: async (q) =>
    (await request<Awaited<ReturnType<ReadApi["runs"]>>>("/ingestion/runs", q)).data,
  run: async (id) =>
    (await request<Awaited<ReturnType<ReadApi["run"]>>>(`/ingestion/runs/${encodeURIComponent(id)}`))
      .data,
  mapping: async (q) =>
    (await request<Awaited<ReturnType<ReadApi["mapping"]>>>("/quality/mapping", q)).data,
  audit: async (q) =>
    (await request<Awaited<ReturnType<ReadApi["audit"]>>>("/audit-events", q)).data,
};

const pending = (what: string) => (): Promise<never> =>
  Promise.reject(
    new ApiError(
      "not_implemented",
      `${what} is not wired to the admin API yet: the write contract is undecided (Q1, Q7).`,
      501,
    ),
  );

/** The write contract is not drafted: every call says so rather than guessing. */
export const httpAuthAdapter: AuthAdapter = {
  signIn: pending("Sign-in"),
  verifyTotp: pending("Code verification"),
  signOut: pending("Sign-out"),
  acceptInvite: pending("Accepting an invitation"),
  enrolTotp: pending("Authenticator enrolment"),
  listSessions: pending("Sessions"),
  revokeSession: pending("Revoking a session"),
  listStaff: pending("Staff"),
  inviteStaff: pending("Inviting staff"),
  changeRole: pending("Changing a role"),
  deactivateStaff: pending("Deactivating staff"),
};
