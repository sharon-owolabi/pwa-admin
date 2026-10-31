"use client";
// DUPLICATED FROM apps/app/src/shared/components/filters-toggle.tsx. Merge into a shared package after the apps/admin code review.
import { smallButton } from "./styles";

/** Hidden filters, counted, so a narrowed list never passes for the whole one. */
export function FiltersToggle({
  open,
  controls,
  active,
  onToggle,
}: {
  open: boolean;
  controls: string;
  active: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`${smallButton} inline-flex items-center gap-1.5`}
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      onClick={onToggle}
    >
      <span aria-hidden>{open ? "▾" : "▸"}</span>
      {active > 0 ? `Filters (${active})` : "Filters"}
    </button>
  );
}
