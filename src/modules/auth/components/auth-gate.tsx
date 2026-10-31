"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { UNAUTHORIZED_EVENT } from "@/shared/api/client";
import type { Me } from "@/shared/api/contract.draft";
import { errorMessage, isUnauthorized } from "@/shared/api/errors";
import { useMe } from "@/shared/api/hooks";
import { LoadingRegion, Skeleton } from "@/shared/components/skeleton";
import { outlineButton } from "@/shared/components/styles";

const StaffContext = createContext<Me | null>(null);

/** The signed-in staff member. Reads the query's data: not a second copy of it. */
export function useCurrentStaff(): Me {
  const me = useContext(StaffContext);
  if (!me) throw new Error("useCurrentStaff must be used inside <AuthGate>");
  return me;
}

/**
 * Client-side gate. The session cookie belongs to the API's origin, so
 * `/me` is the only honest answer to "who is this". This is UX, not security:
 * every route enforces auth and permissions itself.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const me = useMe();
  const signedOut = me.isError && isUnauthorized(me.error);

  useEffect(() => {
    function toSignIn() {
      // The session is gone; so is everything fetched under it.
      queryClient.clear();
      const here = `${window.location.pathname}${window.location.search}`;
      const next = here !== "/" ? `?next=${encodeURIComponent(here)}` : "";
      router.replace(`/sign-in${next}`);
    }
    if (signedOut) toSignIn();
    window.addEventListener(UNAUTHORIZED_EVENT, toSignIn);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, toSignIn);
  }, [signedOut, pathname, queryClient, router]);

  if (me.data) {
    // Keyed by staff id: signing in as someone else resets all local state
    // below, rather than carrying a half-edited form across people.
    return (
      <StaffContext.Provider key={me.data.id} value={me.data}>
        {children}
      </StaffContext.Provider>
    );
  }

  if (me.isError && !signedOut) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div role="alert" className="max-w-sm space-y-4 text-center">
          <p className="font-semibold text-ink">We could not check your session</p>
          <p className="text-sm text-muted">{errorMessage(me.error)}</p>
          <button type="button" className={outlineButton} onClick={() => void me.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Pending, or redirecting to sign-in: the shell's shape, not a spinner.
  return (
    <LoadingRegion label="Checking your session…" className="min-h-dvh">
      <div className="border-b border-line bg-card px-4 py-3">
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </LoadingRegion>
  );
}
