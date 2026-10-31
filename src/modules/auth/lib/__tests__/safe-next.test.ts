import { describe, expect, it } from "vitest";
import { firstAllowed, isActive } from "../nav";
import { safeNext } from "../safe-next";

describe("safeNext", () => {
  it("keeps a path inside the app", () => {
    expect(safeNext("/merchants?gateway=paystack")).toBe("/merchants?gateway=paystack");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil", "javascript:alert(1)", "", null, undefined])(
    "refuses %s",
    (value) => expect(safeNext(value)).toBe("/overview"),
  );
  it("never loops back to an auth page", () => {
    expect(safeNext("/sign-in?next=/x")).toBe("/overview");
  });
});

describe("nav", () => {
  it("marks the section active, including details", () => {
    expect(isActive("/merchants/ws_1", "/merchants")).toBe(true);
    expect(isActive("/merchants-old", "/merchants")).toBe(false);
  });
  it("finds the first screen a member may open", () => {
    expect(firstAllowed(["admin:staff:view"])).toBe("/staff");
    expect(firstAllowed([])).toBeNull();
  });
});
