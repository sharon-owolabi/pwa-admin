"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authApi } from "@/shared/api/client";
import { errorMessage, isApiError } from "@/shared/api/errors";
import { Field, FormError } from "@/shared/components/field";
import { primaryButton } from "@/shared/components/styles";
import { safeNext } from "../lib/safe-next";
import { CodeForm } from "./code-form";
import { MockHint } from "./mock-hint";

/** Work email and password, then a TOTP challenge. */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; locked: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await authApi.signIn({ email: email.trim(), password });
      setChallengeId(result.challengeId);
      setPassword("");
    } catch (err) {
      setError({ message: errorMessage(err), locked: isApiError(err) && err.code === "account_locked" });
    } finally {
      setBusy(false);
    }
  }

  async function verify(code: string) {
    if (!challengeId) return;
    const me = await authApi.verifyTotp({ challengeId, code });
    // Whoever signed in last owns the cache: nothing from a previous person survives.
    queryClient.clear();
    queryClient.setQueryData(["me"], me);
    router.replace(safeNext(params.get("next")));
  }

  if (challengeId) {
    return (
      <div>
        <p className="mb-4 text-sm text-muted">Enter the code from your authenticator app to finish signing in.</p>
        <CodeForm submitLabel="Verify and sign in" onSubmit={verify} onBack={() => setChallengeId(null)} />
        <MockHint>Code 123456.</MockHint>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <FormError>
          {error.message}
          {error.locked ? " This is a security lockout: it lifts by itself." : ""}
        </FormError>
      ) : null}
      <Field
        label="Work email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        autoFocus
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <button type="submit" className={primaryButton} disabled={busy || !email.trim() || !password}>
        {busy ? "Signing in…" : "Continue"}
      </button>
      <MockHint>
        ada@fusion.test (Super Admin) or sam@fusion.test (Support), password &quot;password&quot;.
        locked@fusion.test shows the lockout.
      </MockHint>
    </form>
  );
}
