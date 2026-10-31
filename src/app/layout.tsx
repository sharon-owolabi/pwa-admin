import type { Metadata } from "next";
import { Hanken_Grotesk, Space_Mono } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/modules/theme/theme-store";
import { Providers } from "./providers";
import "./globals.css";

// Self-hosted at build time (the CSP allows fonts from this origin only).
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: { default: "Fusion Admin", template: "%s · Fusion Admin" },
  description: "Internal operations console for Fusion staff.",
  // An internal tool: never indexed. next.config.ts sends X-Robots-Tag too.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script sets data-theme before React hydrates: expected to differ.
    <html lang="en" suppressHydrationWarning className={`${hanken.variable} ${spaceMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
