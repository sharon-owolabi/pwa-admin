import { Suspense } from "react";
import { SyncRunsPage } from "@/modules/sync-runs/components/sync-runs-page";

export const metadata = { title: "Sync runs" };

export default function Page() {
  return (
    <Suspense>
      <SyncRunsPage />
    </Suspense>
  );
}
