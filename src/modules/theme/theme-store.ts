// DUPLICATED FROM apps/app/src/modules/theme/lib/theme-store.ts. Merge into a shared package after the apps/admin code review.
/**
 * The colour theme: light, dark, or system (follow the OS; the default).
 * docs/plans/fusion-theme.md §2.
 *
 * Kept in this browser under `fusion-theme`, and applied as `data-theme` on
 * <html> — "light" or "dark"; system leaves it unset, so the tokens'
 * prefers-color-scheme block decides. Every storage access is guarded:
 * private windows and blocked storage throw, and the app must still render
 * (following the OS).
 */
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

const KEY = "fusion-theme";
const CHANGE = "fusion:theme-change";
const DEFAULT: Theme = "system";

export const isTheme = (v: unknown): v is Theme =>
  typeof v === "string" && (THEMES as readonly string[]).includes(v);

/**
 * Runs in <head> before first paint (app/layout.tsx), so a stored choice is on
 * <html> before anything is drawn: no flash of the other theme. Plain ES5, no
 * imports: it is inlined as text. Mirrors applyTheme below.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY);
    return isTheme(stored) ? stored : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Puts the choice on <html>: the only thing the stylesheet reads. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/** If storage is blocked, the choice still holds for this page view. */
let inPage: Theme | null = null;

export function currentTheme(): Theme {
  return inPage ?? readTheme();
}

export function serverTheme(): Theme {
  return DEFAULT;
}

export function chooseTheme(theme: Theme): void {
  inPage = theme;
  try {
    if (theme === DEFAULT) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, theme);
  } catch {
    // Not persisted; still switch for this page view.
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(CHANGE));
}

/**
 * For useSyncExternalStore. Also listens to `storage`, so a choice made in one
 * tab is applied in the others.
 */
export function subscribeTheme(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    inPage = null;
    applyTheme(readTheme());
    onChange();
  };
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
