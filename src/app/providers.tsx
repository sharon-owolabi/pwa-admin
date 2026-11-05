"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { MOCK_ENABLED } from "@/shared/lib/env";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // The mock needs no network, so it must keep answering offline (TanStack
            // pauses "online" queries when the browser is offline, which would hang the skeleton).
            networkMode: MOCK_ENABLED ? "always" : "online",
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
