import { Suspense } from "react";
import { AuditPage } from "@/modules/audit/components/audit-page";

export const metadata = { title: "Audit and security" };

export default function Page() {
  return (
    <Suspense>
      <AuditPage />
    </Suspense>
  );
}
