import { describe, expect, it } from "vitest";
import { isUpdateWaiting, SKIP_WAITING_MESSAGE } from "../sw-update";

describe("isUpdateWaiting", () => {
  it("prompts only for an installed worker while another one controls the page", () => {
    expect(isUpdateWaiting({ state: "installed", hasController: true })).toBe(true);
  });
  it("does not prompt on the very first install", () => {
    expect(isUpdateWaiting({ state: "installed", hasController: false })).toBe(false);
  });
  it("does not prompt while installing or after activation", () => {
    expect(isUpdateWaiting({ state: "installing", hasController: true })).toBe(false);
    expect(isUpdateWaiting({ state: "activated", hasController: true })).toBe(false);
  });
  it("uses one message name for the page and the worker", () => {
    expect(SKIP_WAITING_MESSAGE).toBe("SKIP_WAITING");
  });
});
