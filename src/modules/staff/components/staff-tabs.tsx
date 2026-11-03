"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/staff", label: "Members" },
  { href: "/staff/approvals", label: "Approvals" },
] as const;

/** Members and Approvals sit under the one Staff entry in the main nav. */
export function StaffTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Staff sections" className="mb-6 flex gap-1 border-b border-line">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
              active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
