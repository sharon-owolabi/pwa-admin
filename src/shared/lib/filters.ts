/**
 * List filters live in the URL, so a view can be shared and Back works.
 * Everything is a string as it sits in the query; unknown keys are dropped and
 * empty values removed, so a hand-edited URL never sends junk to the API.
 */
export function parseFilters<K extends string>(
  params: URLSearchParams | { get(name: string): string | null },
  keys: readonly K[],
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) out[key] = value;
  }
  return out;
}

export function toSearch(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** How many filters are in force (the sort is not a filter). */
export function countFilters(filters: Record<string, string | undefined>, exclude: readonly string[] = []): number {
  return Object.entries(filters).filter(([k, v]) => v && !exclude.includes(k)).length;
}
