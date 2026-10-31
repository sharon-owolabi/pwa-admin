// DUPLICATED FROM apps/app/src/shared/components/notice-panel.tsx. Merge into a shared package after the apps/admin code review.
import type { ReactNode } from "react";

/**
 * Empty, no-access and not-found states. Each says what happened and what to
 * do next — never a blank page, and never an error tone for something that
 * is not an error.
 */
export function NoticePanel({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-card px-5 py-10 text-center shadow-card">
      <h2 className="font-semibold">{title}</h2>
      {children ? <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
