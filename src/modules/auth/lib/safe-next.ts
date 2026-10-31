/**
 * Where to go after sign-in. Only a path inside this app is honoured: anything
 * else (another origin, a protocol-relative `//host`, a backslash trick) falls
 * back to the overview, so a crafted link cannot bounce staff to another site.
 */
export function safeNext(next: string | null | undefined, fallback = "/overview"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  // Never loop back to an auth page.
  if (next.startsWith("/sign-in") || next.startsWith("/accept-invite")) return fallback;
  return next;
}
