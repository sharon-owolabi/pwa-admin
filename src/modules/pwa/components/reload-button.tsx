"use client";

import { outlineButton } from "@/shared/components/styles";

export function ReloadButton() {
  return (
    <button type="button" className={outlineButton} onClick={() => window.location.reload()}>
      Try again
    </button>
  );
}
