import Link from "next/link";
import { Brand } from "@/shared/components/brand";
import { NoticePanel } from "@/shared/components/notice-panel";
import { primaryButton } from "@/shared/components/styles";
import { ReloadButton } from "@/modules/pwa/components/reload-button";

export const metadata = { title: "Offline" };

/**
 * The fallback for a page that was never opened on this device and can't be
 * fetched without a connection. Precached by the service worker (next.config.ts).
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-6 flex justify-center">
        <Brand size="lg" />
      </div>
      <NoticePanel
        title="You're offline"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ReloadButton />
            <Link href="/overview" className={primaryButton}>
              Back to the overview
            </Link>
          </div>
        }
      >
        This page hasn&apos;t been opened on this device yet, so it isn&apos;t available offline. Pages you&apos;ve
        already visited still work.
      </NoticePanel>
    </main>
  );
}
