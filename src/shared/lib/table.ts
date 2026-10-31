/** The table standard (DESIGN.md § Tables): 10 rows by default, with these choices. */
export const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZES)[number];
export const DEFAULT_TABLE_PAGE_SIZE: TablePageSize = 10;
