import { ADMIN_ENV, type AdminEnv } from "@/shared/lib/env";

/* A staff tool open on the wrong environment is dangerous: production is loud,
   staging cautionary, local neutral. This is a safety signal, not decoration. */
const CLASS: Record<AdminEnv, string> = {
  local: "bg-inset text-muted ring-1 ring-line ring-inset",
  staging: "bg-signal-soft text-signal-ink",
  production: "bg-danger text-bg",
};

export function EnvBadge() {
  return (
    <span
      className={`label-mono inline-flex items-center rounded-pill px-2.5 py-0.5 font-bold ${CLASS[ADMIN_ENV]}`}
    >
      <span className="sr-only">Environment: </span>
      {ADMIN_ENV}
    </span>
  );
}
