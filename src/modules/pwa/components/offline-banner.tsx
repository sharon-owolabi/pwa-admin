"use client";

import { useOnlineStatus } from "../hooks/use-online-status";

/** Shown across the top while there is no connection; gone the moment it returns. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="border-b border-line bg-signal-soft px-4 py-2 text-center text-sm text-signal-ink">
      <strong className="font-semibold">You&apos;re offline.</strong> You&apos;re seeing the data that was loaded
      last. It will refresh when you&apos;re back online.
    </div>
  );
}
