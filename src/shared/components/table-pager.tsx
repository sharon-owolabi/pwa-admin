"use client";
// DUPLICATED FROM apps/app/src/shared/components/table-pager.tsx. Merge into a shared package after the apps/admin code review.
import { TABLE_PAGE_SIZES, type TablePageSize } from "@/shared/lib/table";
import { Select } from "./select";
import { pagerButton } from "./styles";

/** Previous / Next above and below the rows. No total count exists, so none is shown. */
export function TablePager({
  position,
  name,
  page,
  count,
  pageSize,
  onPageSize,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  position: "top" | "bottom";
  /** What the rows are, plural: "merchants". */
  name: string;
  page: number;
  count: number;
  pageSize: TablePageSize;
  onPageSize: (size: TablePageSize) => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const top = position === "top";
  const first = (page - 1) * pageSize + 1;
  const showing =
    count === 0 ? `Page ${page} · no ${name}` : `Page ${page} · ${name} ${first}–${first + count - 1}`;
  return (
    <nav
      aria-label={`${name} pages, ${position}`}
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${top ? "mb-3" : "mt-4"}`}
    >
      <p className="text-sm text-muted" aria-live={top ? "polite" : undefined}>
        {showing}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          Rows per page
          <Select
            value={pageSize}
            onChange={(e) => {
              const size = TABLE_PAGE_SIZES.find((s) => s === Number(e.target.value));
              if (size) onPageSize(size);
            }}
            className="rounded-input border border-line bg-card py-1.5 pl-2 text-sm text-ink-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            {TABLE_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
        <button
          type="button"
          className={pagerButton}
          aria-disabled={!hasPrevious}
          onClick={() => hasPrevious && onPrevious()}
        >
          Previous
        </button>
        <button
          type="button"
          className={pagerButton}
          aria-disabled={!hasNext}
          onClick={() => hasNext && onNext()}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
