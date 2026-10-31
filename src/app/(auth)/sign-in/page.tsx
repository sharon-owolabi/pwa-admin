import { Suspense } from "react";
import { AuthShell } from "@/modules/auth/components/auth-shell";
import { SignInForm } from "@/modules/auth/components/sign-in-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell title="Sign in to Fusion Admin">
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
