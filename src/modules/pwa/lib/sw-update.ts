/** The message the page sends a waiting service worker to take over (src/sw.ts listens for it). */
export const SKIP_WAITING_MESSAGE = "SKIP_WAITING";

/**
 * Whether a freshly installed worker is an UPDATE worth telling the person about.
 * `hasController` is whether the page is already controlled: the very first
 * install has no controller, and needs no "refresh" prompt (it just starts working).
 */
export function isUpdateWaiting(input: { state: string; hasController: boolean }): boolean {
  return input.state === "installed" && input.hasController;
}
