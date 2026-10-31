"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/shared/api/errors";
import { Field, FormError } from "@/shared/components/field";
import { primaryButton } from "@/shared/components/styles";

/** A six-digit authenticator code, used for both the sign-in challenge and enrolment. */
export function CodeForm({
  submitLabel,
  onSubmit,
  onBack,
}: {
  submitLabel: string;
  onSubmit: (code: string) => Promise<void>;
  onBack?: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^\d{6}$/.test(code);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(code);
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? <FormError>{error}</FormError> : null}
      <Field
        label="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        hint="From your authenticator app."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!valid || busy}>
          {busy ? "Checking…" : submitLabel}
        </button>
        {onBack ? (
          <button type="button" onClick={onBack} className="text-sm text-muted underline">
            Use a different account
          </button>
        ) : null}
      </div>
    </form>
  );
}
