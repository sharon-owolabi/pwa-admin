import { Suspense } from "react";
import { GatewaysPage } from "@/modules/gateways/components/gateways-page";

export const metadata = { title: "Gateways" };

export default function Page() {
  return (
    <Suspense>
      <GatewaysPage />
    </Suspense>
  );
}
