import { describe, expect, it } from "vitest";
import { ApiError } from "../errors";
import { filterKeyOf, paginate } from "../mock/paginate";
import { ADMIN_PERMISSION, can } from "../permissions";

const items = Array.from({ length: 25 }, (_, i) => i);

describe("paginate (the API's cursor rules)", () => {
  it("pages and ends with a null cursor", () => {
    const key = filterKeyOf({});
    const p1 = paginate(items, { limit: 10 }, key, null);
    expect(p1.items).toHaveLength(10);
    const p2 = paginate(items, { limit: 10, cursor: p1.nextCursor }, key, null);
    expect(p2.items[0]).toBe(10);
    const p3 = paginate(items, { limit: 10, cursor: p2.nextCursor }, key, null);
    expect(p3.items).toHaveLength(5);
    expect(p3.nextCursor).toBeNull();
  });

  it("refuses a cursor used with other filters", () => {
    const p1 = paginate(items, { limit: 10 }, filterKeyOf({ a: "1" }), null);
    try {
      paginate(items, { limit: 10, cursor: p1.nextCursor }, filterKeyOf({ a: "2" }), null);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("invalid_cursor");
      expect((e as ApiError).details).toEqual({ reason: "filters_changed" });
    }
  });

  it("refuses a malformed cursor", () => {
    expect(() => paginate(items, { cursor: "garbage" }, "k", null)).toThrow(ApiError);
  });

  it("treats paging params as not filters", () => {
    expect(filterKeyOf({ a: "1", cursor: "x", limit: 5 })).toBe(filterKeyOf({ a: "1" }));
  });
});

describe("can", () => {
  it("checks permission ids, never role names", () => {
    expect(can(["admin:audit:view"], ADMIN_PERMISSION.AUDIT_VIEW)).toBe(true);
    expect(can(["Super Admin"], ADMIN_PERMISSION.AUDIT_VIEW)).toBe(false);
  });
});
