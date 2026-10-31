// DUPLICATED FROM apps/app/src/shared/components/brand.tsx. Merge into a shared package after the apps/admin code review.
import { BRAND_ASSETS } from "@/shared/lib/brand-assets";

/**
 * The Fusion lockup: the orange icon, then the wordmark drawn in the ink token
 * through a mask of the white wordmark, so one asset follows the theme.
 */
export function Brand({
  size = "md",
  label = "Fusion Admin",
}: {
  size?: "md" | "lg";
  label?: string;
}) {
  const lg = size === "lg";
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <img
        src={BRAND_ASSETS.icon}
        alt=""
        width={lg ? 30 : 22}
        height={lg ? 33 : 24}
        className={lg ? "h-8 w-auto" : "h-6 w-auto"}
      />
      <span
        aria-hidden
        style={{ maskImage: `url("${BRAND_ASSETS.wordmarkWhite}")` }}
        className={`bg-ink [mask-size:contain] [mask-position:left_center] [mask-repeat:no-repeat] ${
          lg ? "h-6 w-[5.4rem]" : "h-[1.1rem] w-16"
        }`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
