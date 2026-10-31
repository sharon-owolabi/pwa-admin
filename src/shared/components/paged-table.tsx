"use client";

import { useId, useState, type ReactNode } from "react";
import type { PagedState } from "@/shared/api/hooks";
import { errorMessage } from "@/shared/api/errors";
import type { TablePageSize } from "@/shared/lib/table";
import { DataTable, TableSkeleton, type Column } from "./data-table";
import { DataUpTo } from "./data-up-to";
import { FiltersToggle } from "./filters-toggle";
import { NoticePanel } from "./notice-panel";
import { RefreshButton } from "./refresh-button";
import { outlineButton, smallButton } from "./styles";
import { TablePager } from "./table-pager";

/**
 * The table standard in one place (DESIGN.md § Tables): filters behind a
 * counting toggle, Refresh, pager above and below, a skeleton on first load
 * and on Refresh, an empty and an error state, cards on phones.
 */
export function PagedTable<T>({
  name,
  singular = name,
  paged,
  pageSize,
  onPageSize,
  columns,
  rowKey,
  filters,
  activeFilters,
  onClear,
  toolbarExtra,
  emptyHint,
}: {
  /** Plural, lowercase: "merchants". */
  name: string;
  singular?: string;
  paged: PagedState<T>;
  pageSize: TablePageSize;
  onPageSize: (size: TablePageSize) => void;
  columns: readonly Column<T>[];
  rowKey: (row: T) => string;
  /** The filter controls; hidden until the toggle opens. */
  filters?: ReactNode;
  activeFilters: number;
  onClear: () => void;
  /** Beside Filters and Refresh; the sort lives here, since it is not a filter. */
  toolbarExtra?: ReactNode;
  emptyHint?: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { query } = paged;
  const loading = query.isPending || refreshing;
  const rows = query.data?.items ?? [];

  const refresh = () => {
    setRefreshing(true);
    void query.refetch().finally(() => setRefreshing(false));
  };

  return (
    <section aria-label={name}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {filters ? (
          <FiltersToggle
            open={open}
            controls={panelId}
            active={activeFilters}
            onToggle={() => setOpen((v) => !v)}
          />
        ) : null}
        {toolbarExtra}
        <RefreshButton name={name} busy={refreshing || query.isFetching} onRefresh={refresh} />
        <span className="ml-auto">
          <DataUpTo value={query.data?.dataUpTo ?? null} />
        </span>
      </div>

      {filters && open ? (
        <div
          id={panelId}
          className="mb-4 rounded-card border border-line bg-card p-4 shadow-card"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filters}</div>
          {activeFilters > 0 ? (
            <button type="button" className={`${smallButton} mt-4`} onClick={onClear}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {query.isError && !refreshing ? (
        <NoticePanel
          title={`Could not load ${name}`}
          action={
            <button type="button" className={outlineButton} onClick={refresh}>
              Try again
            </button>
          }
        >
          {errorMessage(query.error)}
        </NoticePanel>
      ) : loading ? (
        <TableSkeleton label={`Loading ${name}…`} columns={columns.length} rows={pageSize} />
      ) : (
        <>
          <TablePager
            position="top"
            name={name}
            page={paged.page}
            count={rows.length}
            pageSize={pageSize}
            onPageSize={onPageSize}
            hasPrevious={paged.hasPrevious}
            hasNext={paged.hasNext}
            onPrevious={paged.goPrevious}
            onNext={paged.goNext}
          />
          {rows.length === 0 ? (
            <NoticePanel
              title={activeFilters > 0 ? `No ${name} match these filters` : `No ${name} yet`}
              action={
                activeFilters > 0 ? (
                  <button type="button" className={outlineButton} onClick={onClear}>
                    Clear filters
                  </button>
                ) : undefined
              }
            >
              {activeFilters > 0 ? undefined : (emptyHint ?? `There are no ${name} to show.`)}
            </NoticePanel>
          ) : (
            <DataTable
              caption={`${singular} list`}
              columns={columns}
              rows={rows}
              rowKey={rowKey}
            />
          )}
          <TablePager
            position="bottom"
            name={name}
            page={paged.page}
            count={rows.length}
            pageSize={pageSize}
            onPageSize={onPageSize}
            hasPrevious={paged.hasPrevious}
            hasNext={paged.hasNext}
            onPrevious={paged.goPrevious}
            onNext={paged.goNext}
          />
        </>
      )}
    </section>
  );
}
