import { Suspense } from "react";
import { MerchantsPage } from "@/modules/merchants/components/merchants-page";

export const metadata = { title: "Merchants" };

export default function Page() {
  return (
    <Suspense>
      <MerchantsPage />
    </Suspense>
  );
}
