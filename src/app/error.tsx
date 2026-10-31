"use client";

import Link from "next/link";
import { NoticePanel } from "@/shared/components/notice-panel";
import { outlineButton, primaryButton } from "@/shared/components/styles";

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div role="alert">
        <NoticePanel
          title="Something went wrong"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={reset} className={primaryButton}>
                Try again
              </button>
              <Link href="/overview" className={outlineButton}>
                Back to the overview
              </Link>
            </div>
          }
        >
          This page ran into a problem.
          {error.digest ? ` Reference ${error.digest}.` : ""}
        </NoticePanel>
      </div>
    </main>
  );
}
