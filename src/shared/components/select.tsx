// DUPLICATED FROM apps/app/src/shared/components/select.tsx. Merge into a shared package after the apps/admin code review.
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Fill the container's width (a form field); otherwise as wide as its options. */
  block?: boolean;
  /** Spacing around the control, e.g. `mt-2`. */
  wrapperClassName?: string;
};

/**
 * A native `<select>` with our own chevron. The browser's arrow ignores padding
 * in some engines and sits against the border; this one is drawn in
 * `currentColor` (tokens, so it follows dark mode) with room reserved on the
 * right. Callers set LEFT padding only (`pl-2`): a `px-*` would fight `pr-8`.
 */
export function Select({
  block = false,
  wrapperClassName = "",
  className = "",
  children,
  ...select
}: SelectProps) {
  return (
    <span className={`relative ${block ? "block w-full" : "inline-block"} ${wrapperClassName}`}>
      <select {...select} className={`w-full appearance-none pr-8 ${className}`}>
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
