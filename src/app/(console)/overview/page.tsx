import { Suspense } from "react";
import { OverviewPage } from "@/modules/overview/components/overview-page";

export const metadata = { title: "Overview" };

export default function Page() {
  return (
    <Suspense>
      <OverviewPage />
    </Suspense>
  );
}
