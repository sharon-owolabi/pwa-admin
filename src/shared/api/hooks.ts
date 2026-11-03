"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { DEFAULT_TABLE_PAGE_SIZE, type TablePageSize } from "@/shared/lib/table";
import { isLaunchGateway } from "@/shared/lib/gateways";
import { authApi, readApi } from "./client";
import type {
  ApprovalQuery,
  AuditQuery,
  MappingQuery,
  Paging,
  RunQuery,
  StaffQuery,
  TenantQuery,
} from "./contract";
import { isApiError } from "./errors";

/* One hook per read. Screens import these; they never fetch. */

/** 4xx answers (401, 403, 404, 400, 429) will not change on retry. */
const noRetry = (count: number, error: unknown) =>
  count < 2 && !(isApiError(error) && error.statusCode < 500);

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => readApi.me(), retry: false, staleTime: 60_000 });

export const useOverview = () =>
  useQuery({ queryKey: ["overview"], queryFn: () => readApi.overview(), retry: noRetry });

export const useTenant = (id: string) =>
  useQuery({ queryKey: ["tenant", id], queryFn: () => readApi.tenant(id), retry: noRetry });

export const useConnectors = () =>
  useQuery({ queryKey: ["connectors"], queryFn: () => readApi.connectors(), retry: noRetry });

export const useRun = (id: string) =>
  useQuery({ queryKey: ["run", id], queryFn: () => readApi.run(id), retry: noRetry });

export const useSessions = () =>
  useQuery({ queryKey: ["sessions"], queryFn: () => readApi.sessions(), retry: noRetry });

export const useStaffRoles = (enabled: boolean) =>
  useQuery({ queryKey: ["staff-roles"], queryFn: () => readApi.roles(), enabled, retry: noRetry });

/* Paged reads. The cursor sits in the query key beside the filters, so a
   filter change starts at page 1 and a cursor is never reused across filters. */

type Paged = { items: unknown[]; nextCursor: string | null };

function usePagedQuery<Q extends object, R extends Paged>(
  name: string,
  filters: Q,
  pageSize: number,
  fetcher: (query: Q & Paging & { limit: number }) => Promise<R>,
  enabled = true,
  /** Rows not worth showing are dropped from the page (a display filter, never a reshape). */
  visible?: (item: R["items"][number]) => boolean,
) {
  const scope = `${JSON.stringify(filters)}|${pageSize}`;
  // Cursors of the pages visited so far; page 1 has none. Tied to the filters
  // and page size they were issued for.
  const [state, setState] = useState<{ scope: string; cursors: (string | null)[] }>({
    scope,
    cursors: [null],
  });
  const cursors = state.scope === scope ? state.cursors : [null];
  const cursor = cursors[cursors.length - 1] ?? null;

  const query = useQuery({
    queryKey: [name, filters, pageSize, cursor],
    queryFn: () => fetcher({ ...filters, cursor, limit: pageSize }),
    enabled,
    retry: noRetry,
    select: visible ? (page) => ({ ...page, items: page.items.filter(visible) }) : undefined,
  });

  const next = query.data?.nextCursor ?? null;
  const goNext = useCallback(() => {
    if (next) setState({ scope, cursors: [...cursors, next] });
  }, [next, scope, cursors]);
  const goPrevious = useCallback(() => {
    if (cursors.length > 1) setState({ scope, cursors: cursors.slice(0, -1) });
  }, [scope, cursors]);

  return {
    query,
    page: cursors.length,
    hasPrevious: cursors.length > 1,
    hasNext: next !== null,
    goNext,
    goPrevious,
  };
}

export interface PagedState<T> {
  query: UseQueryResult<{ items: T[]; nextCursor: string | null; dataUpTo: string }, unknown>;
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  goNext: () => void;
  goPrevious: () => void;
}

export const useTenants = (filters: TenantQuery, pageSize: number, enabled = true) =>
  usePagedQuery("tenants", filters, pageSize, (q) => readApi.tenants(q), enabled);

export const useRuns = (filters: RunQuery, pageSize: number, enabled = true) =>
  usePagedQuery("runs", filters, pageSize, (q) => readApi.runs(q), enabled, (r) =>
    isLaunchGateway(r.gateway),
  );

export const useMappingRuns = (filters: MappingQuery, pageSize: number) =>
  usePagedQuery("mapping", filters, pageSize, (q) => readApi.mapping(q), true, (r) =>
    r.gateway === null || isLaunchGateway(r.gateway),
  );

export const useAuditEvents = (filters: AuditQuery, pageSize: number, enabled = true) =>
  usePagedQuery("audit", filters, pageSize, (q) => readApi.audit(q), enabled);

export const useStaff = (filters: StaffQuery, pageSize: number, enabled = true) =>
  usePagedQuery("staff", filters, pageSize, (q) => readApi.staff(q), enabled);

export const useApprovals = (filters: ApprovalQuery, pageSize: number, enabled = true) =>
  usePagedQuery("approvals", filters, pageSize, (q) => readApi.approvals(q), enabled);

/**
 * Staff ids with a request waiting for a second approver. The staff list does
 * not carry this, so it is derived from the pending approvals (one page of 100)
 * by matching `targetId`. An invitation that needs approval has no target yet,
 * so it appears on the approvals screen instead.
 */
export function usePendingApprovalTargets(enabled: boolean) {
  return useQuery({
    queryKey: ["approvals-pending-targets"],
    queryFn: async () => {
      const page = await readApi.approvals({ status: "pending", limit: 100 });
      const targets = new Map<string, string>();
      for (const a of page.items) if (a.targetId) targets.set(a.targetId, a.action);
      return targets;
    },
    enabled,
    retry: noRetry,
  });
}

/** Rows per page for a table; changing it goes back to page 1 (the paging scope includes it). */
export function usePageSize() {
  return useState<TablePageSize>(DEFAULT_TABLE_PAGE_SIZE);
}

/** Writes. The API has no idempotency key; each call is one attempt. */
export function useStaffMutations() {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["staff"] });
    void client.invalidateQueries({ queryKey: ["approvals"] });
    void client.invalidateQueries({ queryKey: ["approvals-pending-targets"] });
  };
  const invite = useMutation({
    mutationFn: (v: { email: string; name: string; roleKey: string; reason: string }) =>
      authApi.inviteStaff(v),
    onSuccess: refresh,
  });
  const changeRole = useMutation({
    mutationFn: (v: { staffId: string; roleKey: string; reason: string }) => authApi.changeRole(v),
    onSuccess: refresh,
  });
  const deactivate = useMutation({
    mutationFn: (v: { staffId: string; reason: string }) => authApi.deactivateStaff(v),
    onSuccess: refresh,
  });
  const reissue = useMutation({
    mutationFn: (v: { staffId: string; reason: string }) => authApi.reissueInvitation(v),
    onSuccess: refresh,
  });
  const resetCredentials = useMutation({
    mutationFn: (v: { staffId: string; reason: string }) => authApi.resetCredentials(v),
    onSuccess: refresh,
  });
  const approve = useMutation({
    mutationFn: (v: { approvalId: string; reason?: string }) => authApi.approve(v),
    onSuccess: refresh,
  });
  const reject = useMutation({
    mutationFn: (v: { approvalId: string; reason?: string }) => authApi.reject(v),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (v: { approvalId: string }) => authApi.cancel(v),
    onSuccess: refresh,
  });
  const revokeSession = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession({ sessionId }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["sessions"] }),
  });
  return { invite, changeRole, deactivate, reissue, resetCredentials, approve, reject, cancel, revokeSession };
}
