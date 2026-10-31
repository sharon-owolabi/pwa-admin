#!/usr/bin/env node
/**
 * Fails on raw colour and size literals in app source. See /DESIGN.md.
 *
 * The failure this prevents is SILENT: a raw hex is invisible to the dark-mode
 * token redefinition, so the screen looks right in the theme you built it in.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src"];
const RULES = [
  [/#[0-9a-fA-F]{3,8}\b/, "raw hex colour — use var(--fx-…)"],
  [/\b(?:bg|text|border)-\[#[^\]]+\]/, "arbitrary colour utility — use var(--fx-…)"],
  [/\btext-\[\d+px\]/, "arbitrary font size — use a type token"],
  [
    /\b(?:bg|text|border|ring|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    "raw Tailwind palette utility — use var(--fx-…)",
  ],
  [/\bbg-white\b|\bbg-black\b/, "bg-white/bg-black — use var(--fx-surface)/var(--fx-bg)"],
];

const offenders = [];
function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // root not created yet
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (/\.(tsx?|css|svg)$/.test(entry)) {
      const lines = readFileSync(full, "utf8").split("\n");
      lines.forEach((line, i) => {
        // The token file itself is where the literals are allowed to live.
        if (full.includes("design-tokens")) return;
        if (line.includes("design-tokens-allow")) return;
        for (const [re, msg] of RULES) {
          if (re.test(line)) offenders.push(`${full}:${i + 1}  ${msg}\n    ${line.trim()}`);
        }
      });
    }
  }
}

ROOTS.forEach(walk);

if (offenders.length) {
  console.error(`\n✗ design tokens — ${offenders.length} violation(s):\n`);
  console.error(offenders.join("\n\n"));
  console.error("\nSee /DESIGN.md. Escape hatch (rare, justify it): // design-tokens-allow\n");
  process.exit(1);
}
console.log("✓ design tokens");
