// DUPLICATED FROM apps/app/src/shared/lib/brand-assets.ts. Merge into a shared package after the apps/admin code review.
const BASE = (process.env.NEXT_PUBLIC_BRAND_ASSETS_URL ?? "/brand").replace(/\/+$/, "");
const asset = (file: string) => `${BASE}/${file}`;

export const BRAND_ASSETS = {
  icon: asset("fusion-icon.png"),
  iconWhite: asset("fusion-icon-white.png"),
  wordmarkWhite: asset("fusion-wordmark-white.png"),
} as const;
