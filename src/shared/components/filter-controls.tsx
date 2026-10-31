"use client";

import { useEffect, useId, useState } from "react";
import { GATEWAY_LABEL, LAUNCH_GATEWAYS } from "@/shared/lib/gateways";
import { Select } from "./select";
import { inputClass } from "./styles";

const selectClass = `${inputClass} py-2`;

/** A text filter that applies after a pause, so typing does not refetch per key. */
export function TextFilter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === (value ?? "")) return;
    const timer = setTimeout(() => onChange(trimmed || undefined), 350);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  anyLabel = "Any",
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: readonly { value: string; label: string }[];
  anyLabel?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <Select
        id={id}
        block
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={selectClass}
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export const GATEWAY_OPTIONS = LAUNCH_GATEWAYS.map((g) => ({ value: g, label: GATEWAY_LABEL[g] }));

export function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={inputClass}
      />
    </div>
  );
}
