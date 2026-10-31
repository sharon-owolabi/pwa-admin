"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/shared/api/client";
import { smallButton } from "@/shared/components/styles";
import { useCurrentStaff } from "./auth-gate";

/** Who is signed in, their role, and Sign out. */
export function AccountMenu() {
  const me = useCurrentStaff();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await authApi.signOut();
    } finally {
      // Even if the call failed, this browser forgets the session's data.
      queryClient.clear();
      router.replace("/sign-in");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <p className="hidden text-right leading-tight sm:block">
        <span className="block text-sm font-medium text-ink">{me.name}</span>
        <span className="block text-xs text-muted">{me.role.name}</span>
      </p>
      <button type="button" className={smallButton} onClick={signOut} aria-busy={busy} aria-disabled={busy}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
