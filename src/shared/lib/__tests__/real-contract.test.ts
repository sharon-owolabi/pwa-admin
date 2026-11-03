import { describe, expect, it } from "vitest";
import { approvalActions, approvalSummary } from "@/modules/staff/lib/approvals";
import { errorCategoryLabel } from "@/modules/sync-runs/lib/labels";
import { describeDevice } from "../user-agent";
import { uuidOrUndefined } from "../uuid";
import { dateOnly, intOrUndefined, oneOf, TENANT_SORTS } from "../vocab";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("describeDevice", () => {
  it("names browser and system", () => {
    expect(describeDevice(CHROME_MAC)).toBe("Chrome on macOS");
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1")).toBe("Safari on iOS");
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0) Gecko/20100101 Firefox/131.0")).toBe("Firefox on Windows");
    expect(describeDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36 Edg/130")).toBe("Edge on Windows");
  });
  it("copes with null and nonsense", () => {
    expect(describeDevice(null)).toBe("Unknown device");
    expect(describeDevice("???")).toBe("Unknown device");
  });
});

describe("query narrowing", () => {
  it("keeps only allowed values", () => {
    expect(oneOf(TENANT_SORTS, "-name")).toBe("-name");
    expect(oneOf(TENANT_SORTS, "drop table")).toBeUndefined();
    expect(oneOf(TENANT_SORTS, undefined)).toBeUndefined();
  });
  it("accepts only UUIDs, whole numbers and plain dates", () => {
    expect(uuidOrUndefined("0b7e8d1a-4c2f-4a0e-8f3b-1c2d3e4f5a6b")).toBeDefined();
    expect(uuidOrUndefined("ws_123")).toBeUndefined();
    expect(intOrUndefined("12")).toBe(12);
    expect(intOrUndefined("1.5")).toBeUndefined();
    expect(dateOnly("2026-10-30")).toBe("2026-10-30");
    expect(dateOnly("2026-10-30T00:00:00Z")).toBeUndefined();
  });
});

describe("errorCategoryLabel", () => {
  it("labels every category the API sends and falls back for new ones", () => {
    expect(errorCategoryLabel("upstream_error")).toBe("Gateway returned an error");
    expect(errorCategoryLabel(null)).toBe("Not recorded");
    expect(errorCategoryLabel("brand_new")).toBe("Brand new");
  });
});

const roles = [{ key: "super_admin", name: "Super Admin", description: null, permissions: [] }];

describe("approvals", () => {
  it("summarises the two known requests", () => {
    expect(
      approvalSummary({ action: "staff.role_elevation", payload: { roleKey: "super_admin" }, targetId: "abcdef12-0000" }, roles),
    ).toBe("Promote staff abcdef12 to Super Admin");
    expect(
      approvalSummary(
        { action: "staff.invite_privileged", payload: { email: "a@b.co", name: "Al", roleKey: "super_admin" }, targetId: null },
        roles,
      ),
    ).toBe("Invite Al (a@b.co) as Super Admin");
  });
  it("falls back to the action for anything else", () => {
    expect(approvalSummary({ action: "staff.something_new", payload: null, targetId: null }, roles)).toBe("Staff: something new");
  });
  it("lets approvers decide others' requests, never their own", () => {
    const base = { status: "pending" as const, requestedById: "a", canApprove: true, canManage: true };
    expect(approvalActions({ ...base, meId: "b" })).toEqual({ decide: true, cancel: false });
    expect(approvalActions({ ...base, meId: "a" })).toEqual({ decide: false, cancel: true });
    expect(approvalActions({ ...base, meId: "b", canApprove: false })).toEqual({ decide: false, cancel: false });
    expect(approvalActions({ ...base, meId: "b", status: "approved" })).toEqual({ decide: false, cancel: false });
  });
});

import { byPriority, isActiveProject, keyCountsText, sourceLabel } from "@/modules/merchants/lib/projects";

describe("checkout projects", () => {
  it("writes key counts, zero included", () => {
    expect(keyCountsText({ active: 3, revoked: 1 })).toBe("3 active, 1 revoked");
    expect(keyCountsText({ active: 0, revoked: 0 })).toBe("0 active, 0 revoked");
  });
  it("labels sandbox sources and tolerates a new one", () => {
    expect(sourceLabel("fusion")).toBe("Fusion sandbox");
    expect(sourceLabel("brand_new")).toBe("brand_new");
  });
  it("treats archivedAt null as active", () => {
    expect(isActiveProject({ archivedAt: null })).toBe(true);
    expect(isActiveProject({ archivedAt: "2026-10-01T00:00:00Z" })).toBe(false);
  });
  it("orders gateways by priority", () => {
    expect(byPriority([{ priority: 2, g: "b" }, { priority: 1, g: "a" }]).map((x) => x.g)).toEqual(["a", "b"]);
  });
});
