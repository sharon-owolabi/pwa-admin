"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type {
  AuditQuery,
  MappingQuery,
  RunQuery,
  TenantQuery,
} from "./contract.draft";
import { authApi, readApi } from "./client";
import { isApiError } from "./errors";
import { isLaunchGateway } from "@/shared/lib/gateways";
import { DEFAULT_TABLE_PAGE_SIZE, type TablePageSize } from "@/shared/lib/table";

/* One hook per read. Screens import these; they never fetch. */

/** 4xx answers (401, 403, 404, 400) will not change on retry. */
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

export const useStaff = (enabled: boolean) =>
  useQuery({ queryKey: ["staff"], queryFn: () => authApi.listStaff(), enabled, retry: noRetry });

export const useSessions = () =>
  useQuery({ queryKey: ["sessions"], queryFn: () => authApi.listSessions(), retry: noRetry });

/* Paged reads. The cursor sits in the query key beside the filters, so a
   filter change starts at page 1 and a cursor is never reused across filters. */

type Paged = { items: unknown[]; nextCursor: string | null };

function usePagedQuery<Q extends object, R extends Paged>(
  name: string,
  filters: Q,
  pageSize: number,
  fetcher: (query: Q & { cursor: string | null; limit: number }) => Promise<R>,
  enabled = true,
  /** Rows not worth showing are dropped from the page (a display filter, never a reshape). */
  visible?: (item: R["items"][number]) => boolean,
) {
  const filterKey = JSON.stringify(filters);
  // Cursors of the pages visited so far; page 1 has none. Tied to the filters
  // and page size they were issued for.
  const scope = `${filterKey}|${pageSize}`;
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
  query: UseQueryResult<{ items: T[]; nextCursor: string | null; dataUpTo: string | null }, unknown>;
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  goNext: () => void;
  goPrevious: () => void;
}

export const useTenants = (filters: Omit<TenantQuery, "cursor" | "limit">, pageSize: number, enabled = true) =>
  usePagedQuery("tenants", filters, pageSize, (q) => readApi.tenants(q), enabled);

export const useRuns = (filters: Omit<RunQuery, "cursor" | "limit">, pageSize: number, enabled = true) =>
  usePagedQuery("runs", filters, pageSize, (q) => readApi.runs(q), enabled, (r) => isLaunchGateway(r.gateway));

export const useMappingRuns = (filters: Omit<MappingQuery, "cursor" | "limit">, pageSize: number) =>
  usePagedQuery("mapping", filters, pageSize, (q) => readApi.mapping(q), true, (r) => isLaunchGateway(r.connector));

export const useAuditEvents = (filters: Omit<AuditQuery, "cursor" | "limit">, pageSize: number, enabled = true) =>
  usePagedQuery("audit", filters, pageSize, (q) => readApi.audit(q), enabled);

/* Writes. Each takes an idempotency key made once per attempt. */

export const newIdempotencyKey = (): string => crypto.randomUUID();

export function useStaffMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["staff"] });
  const invite = useMutation({
    mutationFn: (v: { email: string; roleKey: string }) =>
      authApi.inviteStaff({ ...v, idempotencyKey: newIdempotencyKey() }),
    onSuccess: refresh,
  });
  const changeRole = useMutation({
    mutationFn: (v: { staffId: string; roleKey: string; reason: string }) =>
      authApi.changeRole({ ...v, idempotencyKey: newIdempotencyKey() }),
    onSuccess: refresh,
  });
  const deactivate = useMutation({
    mutationFn: (v: { staffId: string; reason: string }) =>
      authApi.deactivateStaff({ ...v, idempotencyKey: newIdempotencyKey() }),
    onSuccess: refresh,
  });
  const revokeSession = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession({ sessionId }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["sessions"] }),
  });
  return { invite, changeRole, deactivate, revokeSession };
}

/** Rows per page for a table; changing it goes back to page 1 (the paging scope includes it). */
export function usePageSize() {
  return useState<TablePageSize>(DEFAULT_TABLE_PAGE_SIZE);
}
