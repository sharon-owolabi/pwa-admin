# Admin console UI — Implementation Plan

**Status:** U0 (this document). Decisions confirmed 2026-10-30. Source brief:
`fusion-api-staging/docs/active/admin-console/ui-session-prompt.md` (Admin Portal PRD + admin plan).
**Scope:** `apps/admin` only. The admin API is being built in parallel in `fusion-api`; its typed
SDK is **not published yet**.

## Decisions (confirmed 2026-10-30)

| #   | Decision                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **English only.** No `next-intl`, no messages files. `check-i18n.mjs` covers `apps/app` only; the console is staff-only. |
| 2   | **Duplicate, don't extract.** Copy what a screen uses into `apps/admin/src/{shared,modules}` with a `DUPLICATED FROM` header. No `packages/ui` now. |
| 3   | **Nav omits unbuilt areas.** Billing, Intelligence Ops, Analytics, Operations do not appear, not even disabled.        |
| 4   | **Mock-first** behind `apps/admin/src/shared/api/` until `@solab-tech/fusion-admin-sdk` is published.                  |
| 5   | **Open:** who owns the admin host name and the environment names in the badge (`fusion-iac`)? Ask the leads. The badge reads `NEXT_PUBLIC_ADMIN_ENV` (`local` / `staging` / `production`) so nothing is blocked. |

## 0. What is there today

| Area        | Today                                                                                                                   | Consequence                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `apps/admin` | One page, error pages, a `globals.css` with the **old** names (`bg-surface`, `border-border`, `text-text`)              | Whole-surface pass in U1; old names go in the same PR                 |
| Deps        | Product SDK + `openapi-fetch`/`openapi-react-query`, TanStack Query, Zustand, no fonts, no theme script                  | Admin SDK is a different client; the product SDK is never used for admin calls |
| `next.config.ts` | `transpilePackages: ["@fusion/ui"]` (stale, no such package); no security headers                                  | Remove it; mirror `apps/app` headers/CSP, add `X-Robots-Tag`          |
| Lint        | `check-design-tokens` and `check-polling` already cover `apps/admin/src`; `check-i18n` does not                          | Tokens and polling rules apply; i18n does not                         |
| Scripts     | `apps/admin` `lint` is `tsc --noEmit` only                                                                              | Root `pnpm lint` runs the shared checks                               |
| Install     | `node_modules` absent here; `~/.npmrc` needs a `read:packages` PAT                                                      | **U1 cannot start until `pnpm install` works.** If it cannot, stop and say so |

## 1. Guardrails (every screen)

- **No merchant content**: no transaction rows, customers, AI conversations, secrets. Counts, statuses
  and technical ids only. A screen that seems to need a row is a contract bug.
- **Nothing moves money.** No refund, payout, dispute or reconciliation write.
- **Honest gaps**: no billing/plan/MRR/trial/coupon/cost/flag data. One "Not available yet"
  `NoticePanel` on the Overview; no screens for them.
- **Stale data labelled**: `data up to {dataUpTo}`; provider figures name the provider.
- **Null = "Not recorded"**, never 0 or blank.
- **Only Paystack, Flutterwave, Interswitch** appear; any other gateway is filtered out in the hooks layer's
  view-model (display filter only, no reshaping of values).
- **No actions** for the on-hold list: suspend/reactivate, trial extension, plan/billing, coupons, affiliates,
  support sessions, connector pause/rollback/sync/backfill/replay/reprocess, flags, incidents, exports, runtime
  settings. No placeholder or disabled buttons.

## 2. Contract

### Facts (decided by the admin plan)

- Base `NEXT_PUBLIC_ADMIN_API_URL` (default `http://localhost:4005`), routes `/v1/admin/*`. Console on 4002.
- Cookie session `fusion_admin.session_token`, `credentials: "include"`. Separate from `fusion.session_token`.
- Lists return `{ data: { items, nextCursor, dataUpTo } }`. **No total count**: never "1 to 10 of N". A
  cursor is valid only with the same filters. Errors: `{ error: { code, message, statusCode, details } }`.
- Permissions are ids, never role names. `GET /v1/admin/me` supplies them; the UI has `useCan(id)`.
- 401 on an authenticated call: clear cache, go to sign-in. `/v1/admin/me` is excluded from the global event
  (the gate reads its own error), as in `apps/app`.
- Staff writes take a **reason** and an **idempotency key**. The API rejects self-role-change and requires a
  second approver for elevation to Super Admin.

### Draft read contract (types marked `DRAFT` in `shared/api/contract.draft.ts`, deleted when the SDK lands)

| Endpoint                            | Query                                                                                        | Payload                                                                                                                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/admin/me`                  |                                                                                              | `{ id, email, name, role: { key, name }, permissions: string[], mfaEnrolled }`                                                                                                                                   |
| `GET /v1/admin/overview`            |                                                                                              | `{ dataUpTo, tenants: { total }, connectionsByGateway, syncHealth: { succeeded, failed, running, cancelled, windowHours }, recentAudit }`                                                                         |
| `GET /v1/admin/tenants`             | `search`, `gateway`, `connectionStatus`, `joinedFrom`, `joinedTo`, `sort`, `cursor`, `limit` | `{ id, name, country, reportingCurrency, createdAt, memberCount, connectionCount, lastSyncedAt\|null, lastActivityAt\|null }`                                                                                    |
| `GET /v1/admin/tenants/{id}`        |                                                                                              | tenant + `connections[]` (gateway, label, status, polling, webhooksReceiving, lastSyncedAt, recordsIngestedToday, backfillDepth, revokedAt) + `transactionCounts[]` (gateway, status, count)                      |
| `GET /v1/admin/connectors`          |                                                                                              | `[{ gateway, tenantsEnabled, connectionsByStatus, runOutcomes, lastSyncedAt, adapterVersion\|null, rateLimitHits\|null, circuitState\|null }]`                                                                   |
| `GET /v1/admin/ingestion/runs[/id]` | `tenantId`, `gateway`, `status`, `from`, `to`, `cursor`, `limit`                             | `{ id, workspaceId, connectionId, gateway, resource, mode, status, recordsFetched, recordsNew\|null, pages, connectorVersion\|null, startedAt, finishedAt\|null, errorCategory\|null }`                            |
| `GET /v1/admin/quality/mapping`     | `tenantId`, `gateway`, `mappingVersion`, `status`, `cursor`, `limit`                         | `{ id, workspaceId, connectionId, connector, resource, mappingVersion, status, recordsRead, recordsMapped, recordsFailed, recordsWarned, failureCount, startedAt, finishedAt\|null }`                             |
| `GET /v1/admin/audit-events`        | `actor`, `action`, `target`, `tenantId`, `scope`, `from`, `to`, `cursor`, `limit`            | `{ id, scope: "platform"\|"tenant", actorLabel, action, targetType\|null, targetId\|null, workspaceId\|null, metadata\|null, createdAt }`                                                                         |

Statuses are lowercase `snake_case`. Connection: `connecting, backfilling, active, degraded, error, paused,
revoked`. Run: `running, succeeded, failed, cancelled`. Anything unknown maps to a neutral pill, never a crash.

### Changes I make to the draft

None to field shapes. Two additions are **questions**, not reshapes (below).

### Write side: `AuthAdapter` (UI-facing interface, mock implementation)

Narrow on purpose, so the API team's Better Auth vs custom-routes decision swaps one file:
`signIn`, `verifyTotp`, `signOut`, `acceptInvite`, `enrolTotp`, `listSessions`, `revokeSession`, `listStaff`,
`inviteStaff`, `changeRole`, `deactivateStaff`.

### Contract questions (for `fusion-api`; do not work around client-side)

| #   | Question                                                                                                                       | Until then                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Q1  | Better Auth routes or custom routes for sign-in / MFA / invite accept / sessions? Response shapes and error codes (lockout, wrong TOTP, expired/replayed invite)? | `AuthAdapter` + mock                                                  |
| Q2  | Does the API ship forgot-password for staff?                                                                                   | No link on sign-in                                                    |
| Q3  | TOTP enrolment: does the API return an `otpauth://` URI (we render the QR) and a manual key, or an image?                       | Render QR from a URI client-side; see §4                              |
| Q4  | `GET /v1/admin/overview` `connectionsByGateway[].byStatus`: are zero-count statuses omitted or present?                         | Treat missing as 0 in the view only                                   |
| Q5  | Tenant `sort` accepted values?                                                                                                 | Offer `name`, `createdAt`, `lastSyncedAt` (asc/desc) and confirm      |
| Q6  | Audit `metadata` shape and whether it may contain merchant content. If it can, the API must strip it.                          | Never render `metadata` raw; show nothing from it until answered      |
| Q7  | Staff list/invite/role/deactivate/session payloads, including the "waiting for a second approver" state and idempotency header name | Mock                                                                  |
| Q8  | Permission ids (`admin-permissions` in `fusion-shared`) for each control                                                        | Placeholder ids in one file, replaced by the shared package           |
| Q9  | Unrecognised gateways: confirm the API may send them and the UI should hide them                                                | Hide                                                                  |
| Q10 | Admin host name and environment names (`fusion-iac`)                                                                            | `NEXT_PUBLIC_ADMIN_ENV`                                               |

## 3. Architecture

```
apps/admin/src
  app/                       routes: (auth)/sign-in, accept-invite; (console)/ overview, merchants[/id],
                             gateways, sync-runs[/id], data-quality, audit, staff
  modules/
    auth/    AuthGate, useCan, sign-in, TOTP challenge, accept-invite, sessions
    overview/ merchants/ gateways/ sync-runs/ quality/ audit/ staff/
    theme/                   duplicated
  shared/
    api/     client.ts (admin fetch, 401 event), contract.draft.ts, hooks (useMe, useTenants, ...),
             auth-adapter.ts, mock/ (fixtures + adapter, NEXT_PUBLIC_ADMIN_MOCK)
    components/ lib/         duplicated, English strings
```

- **Screens import hooks, never fetch.** All admin access lives in `shared/api/`.
- **Mock switch**: `NEXT_PUBLIC_ADMIN_MOCK` is `on` unless set to `off`. Fixtures are typed with the
  draft types, so a contract change breaks the build. They contain no merchants' people, no secrets, no rows,
  and include empty, failing and stale cases plus an unknown-status and a non-launch gateway (to prove the hide).
- **Filters live in the URL** for lists; cursor resets when filters change (query key), `initialPageParam: null`.
- **Gate keyed by staff id**: sign-out/in as someone else resets all local state.
- **Polling**: none planned. If run lists later want it, use `liveRefetchInterval` from the duplicated
  `live-status.ts`.
- **Hygiene**: `robots: noindex` metadata and `X-Robots-Tag: noindex, nofollow`; CSP mirrored from `apps/app`
  with `connect-src` for the admin API origin; no third-party analytics; `localStorage` holds the theme only.

## 4. Component inventory (duplicated from `apps/app/src`)

Header on each copy: `DUPLICATED FROM apps/app/src/<path>. Merge into a shared package after the apps/admin code review.`
Replace `useTranslations`/`useText` with plain English while copying. Copy only what a screen uses.

| Copy                                                      | From                                                           | First used |
| --------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| `brand`, `brand-assets`, `public/brand/*`                 | `shared/components/brand.tsx`, `shared/lib/brand-assets.ts`    | U1         |
| `theme-store`, `theme-toggle`                             | `modules/theme/*`                                              | U1         |
| `skeleton`, `notice-panel`, `status-badge`, `styles`, `form`, `select`, `page-header` | `shared/components/*`                | U1         |
| `status-tone`, `dates`, `table`, `live-status` (lib)      | `shared/lib/*`                                                 | U1         |
| `auth-shell`, `sign-in-form` shape, `auth-gate`, `use-can` | `modules/auth/*`                                              | U1         |
| `filters-toggle`, `refresh-button`, `table-pager`         | `shared/components/*`                                          | U2         |
| table component and its skeleton                          | `modules/ledger/components/ledger-table.tsx`, `skeletons.tsx`  | U2         |
| audit page patterns                                       | `modules/audit/*`                                              | U4         |

Not copied: `money.ts` (the console shows no money), `report.ts`/`client-reporting` (no third-party
reporting; error pages stay local), `workspace-channel` (no workspaces), `next-intl` anything.

**New dependency**: a TOTP QR. Smallest option wins; candidates are `qrcode` (renders to SVG string, no DOM) or an
inline generator. Verify with `npm view <pkg> version` and bundle size at U1; justified in that PR.

## 5. Phases (one PR each into `staging`, squash, Conventional Commit title)

| Phase | Branch               | Delivers                                                                                                                                                                                 |
| ----- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U0    | `docs/admin-console-ui` | This plan                                                                                                                                                                             |
| U1    | `feat/admin-shell`   | `globals.css` vocabulary swap, fonts, theme + boot script, brand, headers/CSP/noindex, nav (six entries), environment badge, `AuthGate`, sign-in, TOTP challenge, accept-invite, error pages; `shared/api` skeleton, `AuthAdapter` + mock, `useMe`. Review: inline + **security-auditor** |
| U2    | `feat/admin-merchants` | Overview (+ "Not available yet" notice), Merchants table, Merchant profile                                                                                                             |
| U3    | `feat/admin-gateways` | Gateways cards + per-gateway tenant list, Sync runs + detail, Data quality                                                                                                              |
| U4    | `feat/admin-audit-staff` | Audit and security, Staff (invite, role change with reason, deactivate, own sessions). Review: inline + **security-auditor**; **gap-finder** at phase end                            |

Per phase: vitest for pure helpers (status mapping, filters to query, cursor handling, permission checks) and
non-trivial component logic; `pnpm lint`, `pnpm test`, `pnpm knip:prod`; drive the app with the mock on at
390 / 768 / 1440 and say what could not be verified.

## 6. Risks

- **Install**: private registry needs a `read:packages` PAT in `~/.npmrc` (not in the repo). No install, no U1.
- **Draft drift**: the draft may not match the real API. Contained in `contract.draft.ts` and the mock; the swap to
  the SDK should be a hooks-layer change only.
- **Whole-surface rule**: U1 must convert every admin file, never half a screen.

## Status (2026-10-30)

Built standalone in `/Users/sharonowolabi/Desktop/fusion-admin-console` (this folder), mock-first, English
only. All of U1–U4 are implemented against the mock; see MERGE.md for folding it into `fusion-client`.
Verified: `tsc --noEmit`, design-token check, vitest (see below), production build. Not verified: real API,
browser accessibility audit (`agent-browser` not run), CI-only checks (knip, polling, i18n).
