# Merging this into fusion-client

This project was built standalone so it needs no private registry token. `src/` and `public/`
mirror `fusion-client/apps/admin`, so merging is a copy.

## Steps

1. Branch from `staging`: `feat/admin-console` (or one branch per phase, see PLAN.md §5).
2. Copy into `apps/admin/`: `src/`, `public/brand/`, `next.config.ts`. Delete the old
   `src/app/{page,layout,globals,error,global-error}` first; this tree replaces them.
3. `src/app/globals.css`: change
   `@import "../../design-tokens/tokens.css";` to `@import "@fusion/design-tokens/tokens.css";`.
   (`design-tokens/tokens.css` here is a copy of `packages/design-tokens/tokens.css`; do not copy it back.)
4. `apps/admin/package.json`: add `qrcode` and `@types/qrcode`. Drop deps the console does not use
   if knip complains (`@solab-tech/fusion-sdk`, `openapi-*` are not imported by this code).
5. Add a vitest alias for `@` if `apps/admin` has none (see `vitest.config.ts` here).
6. `next.config.ts` here already drops the stale `transpilePackages: ["@fusion/ui"]`.
7. Run `pnpm install`, `pnpm lint` (token + polling checks), `pnpm test`, `pnpm knip:prod`.
8. Review each phase against `.claude/agents/` rubrics; `security-auditor` for auth (U1) and staff (U4).

## What to change when the admin SDK is published

- Delete `src/shared/api/contract.draft.ts`, `http-adapter.ts` and `mock/`.
- Re-implement `shared/api/client.ts` and `hooks.ts` with `$api`-style typed calls
  (`apps/app/src/shared/api/client.ts`); derive row types from `operations[...]`.
- Replace `shared/api/permissions.ts` with `admin-permissions` from `@solab-tech/fusion-shared`.
- Implement `AuthAdapter` against the chosen routes (PLAN.md Q1, Q7).

## Duplicated code

Every file copied from `apps/app` carries a `DUPLICATED FROM ...` header. Merge them into a
shared package after the apps/admin code review.
