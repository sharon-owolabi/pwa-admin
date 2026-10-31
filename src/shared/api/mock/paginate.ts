import type { Page } from "../contract.draft";
import { ApiError } from "../errors";

/**
 * Keyset-style paging for the mock, with the real API's rule: a cursor is only
 * valid with the same filters (400 invalid_cursor, details.reason).
 */
export function paginate<T>(
  items: readonly T[],
  query: { cursor?: string | null; limit?: number },
  filterKey: string,
  dataUpTo: string | null,
): Page<T> {
  const limit = Math.min(Math.max(query.limit ?? 10, 1), 200);
  let offset = 0;
  if (query.cursor) {
    const [key, raw] = query.cursor.split("|");
    const n = Number(raw);
    if (key === undefined || raw === undefined || !Number.isInteger(n) || n < 0) {
      throw new ApiError("invalid_cursor", "That page link is not valid.", 400, { reason: "malformed" });
    }
    if (key !== filterKey) {
      throw new ApiError("invalid_cursor", "The filters changed; start again.", 400, {
        reason: "filters_changed",
      });
    }
    offset = n;
  }
  const slice = items.slice(offset, offset + limit);
  const next = offset + limit;
  return {
    items: slice,
    nextCursor: next < items.length ? `${filterKey}|${next}` : null,
    dataUpTo,
  };
}

/** Same filters → same key. Paging params are not filters. */
export function filterKeyOf(query: object): string {
  const entries = Object.entries(query)
    .filter(([k, v]) => k !== "cursor" && k !== "limit" && v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return encodeURIComponent(JSON.stringify(entries)).replaceAll("|", "%7C");
}
