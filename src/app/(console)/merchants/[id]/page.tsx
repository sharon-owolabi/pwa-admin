import { Suspense } from "react";
import { MerchantProfilePage } from "@/modules/merchants/components/merchant-profile-page";

export const metadata = { title: "Merchant" };

export default function Page() {
  return (
    <Suspense>
      <MerchantProfilePage />
    </Suspense>
  );
}
