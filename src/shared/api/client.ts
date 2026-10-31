import { MOCK_ENABLED } from "@/shared/lib/env";
import type { AuthAdapter } from "./auth-adapter";
import { httpAuthAdapter, httpReadApi } from "./http-adapter";
import { mockAuthAdapter, mockReadApi } from "./mock/adapter";
import type { ReadApi } from "./read-api";

export { UNAUTHORIZED_EVENT } from "./http-adapter";

/**
 * THE admin API boundary. Screens never fetch; they use the hooks in this
 * folder, which go through these two objects. Until the admin SDK exists the
 * mock is on by default (NEXT_PUBLIC_ADMIN_MOCK).
 */
export const readApi: ReadApi = MOCK_ENABLED ? mockReadApi : httpReadApi;
export const authApi: AuthAdapter = MOCK_ENABLED ? mockAuthAdapter : httpAuthAdapter;
