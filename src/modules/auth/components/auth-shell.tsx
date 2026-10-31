import type { ReactNode } from "react";
import { Brand } from "@/shared/components/brand";
import { EnvBadge } from "@/shared/components/env-badge";
import { ThemeToggle } from "@/modules/theme/theme-toggle";

/** The frame for sign-in and invitation screens: brand, environment, one card. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Brand size="lg" />
          <div className="flex items-center gap-2">
            <EnvBadge />
            <ThemeToggle />
          </div>
        </div>
        <div className="rounded-card border border-line bg-card p-6 shadow-card">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-5">{children}</div>
        </div>
        <p className="mt-4 text-center text-xs text-muted">Internal tool. Fusion staff only.</p>
      </div>
    </main>
  );
}
