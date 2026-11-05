"use client";

import { useEffect, useRef, useState } from "react";
import { outlineButton, primaryButton } from "@/shared/components/styles";
import { isUpdateWaiting, SKIP_WAITING_MESSAGE } from "../lib/sw-update";

/**
 * Registers the service worker (production builds only) and, when a new
 * version has installed and is waiting, offers "Refresh". The page never
 * reloads by itself: a person mid-task keeps their screen until they choose.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Only reload for a change WE asked for: the first install also fires controllerchange.
  const refreshing = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;

    const onControllerChange = () => {
      if (refreshing.current) window.location.reload();
    };
    container.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;
    const onVisible = () => {
      // Deployed while the tab sat open: look for it when the person comes back.
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    };

    container
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;
        const hasController = () => container.controller !== null;
        if (reg.waiting && hasController()) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (isUpdateWaiting({ state: worker.state, hasController: hasController() })) {
              setWaiting(worker);
              setDismissed(false);
            }
          });
        });
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {
        // No worker (private window, blocked, unsupported): the app works online as before.
      });

    return () => {
      container.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!waiting || dismissed) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-4 shadow-card"
    >
      <p className="text-sm text-ink">
        <strong className="font-semibold">New version available.</strong> Refresh to use it.
      </p>
      <div className="flex gap-2">
        <button type="button" className={outlineButton} onClick={() => setDismissed(true)}>
          Later
        </button>
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            refreshing.current = true;
            waiting.postMessage({ type: SKIP_WAITING_MESSAGE });
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
