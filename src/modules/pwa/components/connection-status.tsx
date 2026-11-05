"use client";

import { useOnlineStatus } from "../hooks/use-online-status";

/** A small Online / Offline pill that follows the connection. Announced politely when it changes. */
export function ConnectionStatus() {
  const online = useOnlineStatus();
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium ${
        online ? "bg-ok-soft text-ok-ink" : "bg-signal-soft text-signal-ink"
      }`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${online ? "bg-ok" : "bg-signal"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}
