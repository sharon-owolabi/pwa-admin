/**
 * Status colours are claims (DESIGN.md): success and danger only where the
 * outcome is plainly good or bad, signal where something wants attention but
 * nothing has failed, muted for everything in between.
 */
export type StatusTone = "success" | "signal" | "danger" | "muted";
