import { Suspense } from "react";
import { StaffPage } from "@/modules/staff/components/staff-page";

export const metadata = { title: "Staff" };

export default function Page() {
  return (
    <Suspense>
      <StaffPage />
    </Suspense>
  );
}
