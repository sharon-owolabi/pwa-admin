import { Suspense } from "react";
import { ApprovalsPage } from "@/modules/staff/components/approvals-page";

export const metadata = { title: "Staff approvals" };

export default function Page() {
  return (
    <Suspense>
      <ApprovalsPage />
    </Suspense>
  );
}
