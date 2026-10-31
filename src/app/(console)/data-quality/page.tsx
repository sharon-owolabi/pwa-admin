import { Suspense } from "react";
import { DataQualityPage } from "@/modules/quality/components/data-quality-page";

export const metadata = { title: "Data quality" };

export default function Page() {
  return (
    <Suspense>
      <DataQualityPage />
    </Suspense>
  );
}
