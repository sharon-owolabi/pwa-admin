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
4. `apps/admin/package.json`: add `qrcode`, `@types/qrcode` and `openapi-fetch`. Drop deps the console does not
   use if knip complains (`@solab-tech/fusion-sdk` and `openapi-react-query` are not imported by this code).
5. Add a vitest alias for `@` if `apps/admin` has none (see `vitest.config.ts` here).
6. `next.config.ts` here already drops the stale `transpilePackages: ["@fusion/ui"]`.
7. Run `pnpm install`, `pnpm lint` (token + polling checks), `pnpm test`, `pnpm knip:prod`.
8. Review each phase against `.claude/agents/` rubrics; `security-auditor` for auth (U1) and staff (U4).

## Real API (done) and what is left for the SDK

- The console talks to the real admin API by default (`NEXT_PUBLIC_ADMIN_MOCK` is off; set it to `on` for
  fixtures). `src/shared/api/admin-contract.ts` is a copy of `fusion-api/packages/admin-sdk/src/types.ts`;
  `contract.ts` derives every row type from it, and the mock fixtures are typed by those, so a contract
  change breaks the build.
- `http-adapter.ts` uses `openapi-fetch` (a public package) with that contract, with `credentials: "include"`.
- When `@solab-tech/fusion-admin-sdk` is published: delete `admin-contract.ts`, import `paths`/`operations`
  from the package, and replace the `createClient` call in `http-adapter.ts` with `createAdminClient`.
- `shared/api/permissions.ts` copies `ADMIN_PERMISSION` from `fusion-api/packages/shared`; replace it with the
  shared export once published.

## Duplicated code

Every file copied from `apps/app` carries a `DUPLICATED FROM ...` header. Merge them into a
shared package after the apps/admin code review.
