"use client";
// DUPLICATED FROM apps/app/src/modules/theme/components/theme-toggle.tsx. Merge into a shared package after the apps/admin code review.

import { useId, useSyncExternalStore, type ReactNode } from "react";
import {
  chooseTheme,
  currentTheme,
  serverTheme,
  subscribeTheme,
  THEMES,
  type Theme,
} from "./theme-store";

const ICONS: Record<Theme, ReactNode> = {
  light: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
    </>
  ),
  dark: <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" />,
  system: (
    <>
      <rect x="2" y="3" width="12" height="8" rx="1.5" />
      <path d="M6 14h4M8 11v3" />
    </>
  ),
};

const LABEL: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

/** Light, dark or system, as native radios under icons. Kept in this browser. */
export function ThemeToggle() {
  const name = useId();
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
  return (
    <fieldset className="flex items-center rounded-pill border border-line bg-inset p-0.5">
      <legend className="sr-only">Colour theme</legend>
      {THEMES.map((option) => (
        <label
          key={option}
          title={LABEL[option]}
          className="relative flex size-7 cursor-pointer items-center justify-center rounded-pill text-muted transition-colors hover:text-ink has-[:checked]:bg-card has-[:checked]:text-ink has-[:checked]:shadow-card has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={theme === option}
            onChange={() => chooseTheme(option)}
            className="sr-only"
          />
          <span className="sr-only">{LABEL[option]}</span>
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            {ICONS[option]}
          </svg>
        </label>
      ))}
    </fieldset>
  );
}
