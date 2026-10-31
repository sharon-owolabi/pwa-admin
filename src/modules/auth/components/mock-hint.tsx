import { MOCK_ENABLED } from "@/shared/lib/env";

/** Mock mode only: the demo logins, so nobody has to guess. Test values, no real credentials. */
export function MockHint({ children }: { children: React.ReactNode }) {
  if (!MOCK_ENABLED) return null;
  return (
    <p className="mt-5 rounded-input bg-cream px-3 py-2 text-xs text-ink-2">
      <span className="label-mono mr-1.5 font-bold">Mock data</span>
      {children}
    </p>
  );
}
