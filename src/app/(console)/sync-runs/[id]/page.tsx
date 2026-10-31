import { Suspense } from "react";
import { RunDetailPage } from "@/modules/sync-runs/components/run-detail-page";

export const metadata = { title: "Sync run" };

export default function Page() {
  return (
    <Suspense>
      <RunDetailPage />
    </Suspense>
  );
}
