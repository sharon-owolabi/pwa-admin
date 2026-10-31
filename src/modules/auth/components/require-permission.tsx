"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminPermission } from "@/shared/api/permissions";
import { NoticePanel } from "@/shared/components/notice-panel";
import { primaryButton } from "@/shared/components/styles";
import { useCan } from "../hooks/use-can";
import { firstAllowed } from "../lib/nav";
import { useCurrentStaff } from "./auth-gate";

/** A screen's own gate: UX only, the API answers 403 regardless. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: AdminPermission;
  children: ReactNode;
}) {
  const allowed = useCan(permission);
  const { permissions } = useCurrentStaff();
  if (allowed) return <>{children}</>;
  const elsewhere = firstAllowed(permissions);
  return (
    <NoticePanel
      title="You don't have access to this screen"
      action={
        elsewhere ? (
          <Link href={elsewhere} className={primaryButton}>
            Go to a screen you can open
          </Link>
        ) : undefined
      }
    >
      Your role doesn&apos;t include it. Ask a Super Admin if you need it.
    </NoticePanel>
  );
}
