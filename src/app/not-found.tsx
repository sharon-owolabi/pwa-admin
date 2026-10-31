import Link from "next/link";
import { NoticePanel } from "@/shared/components/notice-panel";
import { primaryButton } from "@/shared/components/styles";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <NoticePanel
        title="Page not found"
        action={
          <Link href="/overview" className={primaryButton}>
            Back to the overview
          </Link>
        }
      >
        That page does not exist in the admin console.
      </NoticePanel>
    </main>
  );
}
