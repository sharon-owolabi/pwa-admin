import type { ReactNode } from "react";
import { LoadingRegion, Skeleton } from "./skeleton";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** The card's heading on phones. One per table. */
  primary?: boolean;
  /** Not shown on phones' cards. */
  hideOnCard?: boolean;
}

/**
 * A table on desktop, cards on phones (DESIGN.md § Tables). The caption is
 * visually hidden; headers carry scope="col".
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0]!;
  const rest = columns.filter((c) => c !== primary && !c.hideOnCard);
  return (
    <>
      <div className="hidden overflow-x-auto rounded-card border border-line bg-card shadow-card md:block">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-inset">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="label-mono px-4 py-2.5 font-normal text-muted">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-ink-2">
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-card border border-line bg-card p-4 shadow-card">
            <div className="font-medium text-ink">{primary.cell(row)}</div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {rest.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-muted">{c.header}</dt>
                  <dd className="min-w-0 break-words text-ink-2">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The table's own shape while it loads (and on Refresh). */
export function TableSkeleton({
  label,
  columns,
  rows = 10,
}: {
  label: string;
  columns: number;
  rows?: number;
}) {
  return (
    <LoadingRegion label={label}>
      <div className="hidden overflow-hidden rounded-card border border-line bg-card shadow-card md:block">
        <div className="flex gap-6 bg-inset px-4 py-3">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex gap-6 px-4 py-3.5">
              {Array.from({ length: columns }, (_, i) => (
                <Skeleton key={i} className="h-3.5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <ul className="space-y-3 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }, (_, r) => (
          <li key={r} className="space-y-2.5 rounded-card border border-line bg-card p-4 shadow-card">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}
