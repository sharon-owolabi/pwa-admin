const int = new Intl.NumberFormat("en");
/** A count. Counts only: the console shows no money. */
export const formatCount = (n: number): string => int.format(n);
