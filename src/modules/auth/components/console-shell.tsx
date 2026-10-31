"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Brand } from "@/shared/components/brand";
import { EnvBadge } from "@/shared/components/env-badge";
import { ThemeToggle } from "@/modules/theme/theme-toggle";
import { can } from "@/shared/api/permissions";
import { isActive, NAV } from "../lib/nav";
import { AccountMenu } from "./account-menu";
import { useCurrentStaff } from "./auth-gate";

/** Sticky header, nav, and the page. Nav entries the member cannot open are not rendered. */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { permissions } = useCurrentStaff();
  const items = NAV.filter((n) => can(permissions, n.permission));
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-pill focus:bg-card focus:px-3 focus:py-1.5"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Brand />
            <EnvBadge />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-7xl overflow-x-auto px-4">
          <ul className="flex min-w-max gap-1">
            {items.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`block border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                      active
                        ? "border-accent text-ink"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
