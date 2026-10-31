import { Suspense } from "react";
import { AcceptInvite } from "@/modules/auth/components/accept-invite";
import { AuthShell } from "@/modules/auth/components/auth-shell";

export const metadata = { title: "Accept invitation" };

export default function AcceptInvitePage() {
  return (
    <AuthShell title="Join Fusion Admin">
      <Suspense>
        <AcceptInvite />
      </Suspense>
    </AuthShell>
  );
}
