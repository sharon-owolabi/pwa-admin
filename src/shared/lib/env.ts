export type AdminEnv = "local" | "staging" | "production";

const raw = process.env.NEXT_PUBLIC_ADMIN_ENV;

/** Which environment this console is open on. A staff tool on the wrong one is dangerous. */
export const ADMIN_ENV: AdminEnv =
  raw === "staging" || raw === "production" || raw === "local" ? raw : "local";

/** On unless explicitly `off`: the admin SDK is not published yet (PLAN.md §3). */
export const MOCK_ENABLED = process.env.NEXT_PUBLIC_ADMIN_MOCK !== "off";

export const ADMIN_API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:4005";
