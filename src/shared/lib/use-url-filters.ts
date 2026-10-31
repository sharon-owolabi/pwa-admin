"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { parseFilters, toSearch } from "./filters";

/** Filters from, and written to, the URL. Wrap the calling page in <Suspense>. */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => parseFilters(params, keys), [params, keys]);
  const setFilter = useCallback(
    (patch: Partial<Record<K, string | undefined>>) => {
      const next = { ...filters, ...patch } as Record<string, string | undefined>;
      router.replace(`${pathname}${toSearch(next)}`, { scroll: false });
    },
    [filters, pathname, router],
  );
  const clear = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);
  return { filters, setFilter, clear };
}
