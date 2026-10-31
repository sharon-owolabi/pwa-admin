import { AuthGate } from "@/modules/auth/components/auth-gate";
import { ConsoleShell } from "@/modules/auth/components/console-shell";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <ConsoleShell>{children}</ConsoleShell>
    </AuthGate>
  );
}
