"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authApi } from "@/shared/api/client";
import type { AcceptedInvite } from "@/shared/api/contract";
import { errorMessage, isApiError } from "@/shared/api/errors";
import { Field, FormError } from "@/shared/components/field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { primaryButton } from "@/shared/components/styles";
import { TotpQr } from "@/shared/components/totp-qr";
import { CodeForm } from "./code-form";
import { MockHint } from "./mock-hint";

const MIN_PASSWORD = 12;

/**
 * Single-use invitation: set a password, then enrol an authenticator (QR plus a
 * manual key). An expired or replayed link is a dead end, said plainly.
 */
export function AcceptInvite() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSearchParams().get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dead, setDead] = useState(false);
  const [setup, setSetup] = useState<AcceptedInvite | null>(null);
  const [name, setName] = useState("");

  const mismatch = confirm !== "" && confirm !== password;
  const tooShort = password !== "" && password.length < MIN_PASSWORD;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || tooShort || mismatch || !password || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setSetup(await authApi.acceptInvite({ token, name: name.trim(), password }));
      setPassword("");
      setConfirm("");
    } catch (err) {
      if (isApiError(err) && err.code === "invitation_invalid") setDead(true);
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  /** There is no separate enrol call: the first authenticator code completes sign-in. */
  async function enrol(code: string) {
    const me = await authApi.verifyMfa({ code });
    queryClient.clear();
    queryClient.setQueryData(["me"], me);
    router.replace("/overview");
  }

  if (!token || dead) {
    return (
      <NoticePanel
        title="This invitation can't be used"
        action={
          <Link href="/sign-in" className={primaryButton}>
            Go to sign-in
          </Link>
        }
      >
        The link has expired or was already used. Ask a Super Admin to send a new invitation.
      </NoticePanel>
    );
  }

  if (setup) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Scan this with an authenticator app, or type the key in by hand. You will need a code from it every time you sign in.
        </p>
        <div className="flex justify-center">
          <TotpQr uri={setup.otpauthUrl} />
        </div>
        <p className="text-center text-sm">
          <span className="text-muted">Manual key </span>
          <code className="font-mono text-ink">{setup.manualKey}</code>
        </p>
        <CodeForm submitLabel="Confirm and sign in" onSubmit={enrol} />
        <MockHint>Code 123456.</MockHint>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">Choose a password for your Fusion Admin account.</p>
      {error ? <FormError>{error}</FormError> : null}
      <Field
        label="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        autoFocus
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD} characters.`}
        error={tooShort ? `Use at least ${MIN_PASSWORD} characters.` : null}
      />
      <Field
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        error={mismatch ? "The passwords do not match." : null}
      />
      <button type="submit" className={primaryButton} disabled={busy || !name.trim() || !password || tooShort || mismatch}>
        {busy ? "Saving…" : "Set password"}
      </button>
      <MockHint>Open /accept-invite?token=ok-demo. Any other token is a dead link.</MockHint>
    </form>
  );
}
