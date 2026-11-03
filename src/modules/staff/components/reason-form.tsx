"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { errorMessage } from "@/shared/api/errors";
import { Field, FormError } from "@/shared/components/field";
import { dangerButton, primaryButton } from "@/shared/components/styles";

export const MIN_REASON = 3;

/**
 * The shape every staff write shares: say why (recorded in the audit log), then
 * confirm. `extra` holds a dialog's own fields, `extraValid` whether they are
 * complete. The API's own error message is shown on failure.
 */
export function ReasonForm({
  intro,
  confirmLabel,
  busyLabel,
  danger = false,
  optionalReason = false,
  extra,
  extraValid = true,
  error,
  busy,
  onSubmit,
}: {
  intro?: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  danger?: boolean;
  /** Approve/reject take an optional reason; staff writes require one. */
  optionalReason?: boolean;
  extra?: ReactNode;
  extraValid?: boolean;
  error: unknown;
  busy: boolean;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const reasonOk = optionalReason ? true : trimmed.length >= MIN_REASON;
  const valid = reasonOk && extraValid;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid && !busy) onSubmit(trimmed);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {intro ? <div className="text-sm text-muted">{intro}</div> : null}
      {error ? <FormError>{errorMessage(error)}</FormError> : null}
      {extra}
      <Field
        label={optionalReason ? "Reason (optional)" : "Reason"}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        hint="Recorded in the audit log."
        error={!optionalReason && reason !== "" && trimmed.length < MIN_REASON ? "Say a little more." : null}
      />
      <button type="submit" className={danger ? dangerButton : primaryButton} disabled={!valid || busy}>
        {busy ? busyLabel : confirmLabel}
      </button>
    </form>
  );
}
