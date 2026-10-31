import { describe, expect, it } from "vitest";
import { dayEndIso, dayStartIso, formatDuration } from "../dates";
import { countFilters, parseFilters, toSearch } from "../filters";

describe("parseFilters", () => {
  it("keeps known keys, drops unknown and empty ones", () => {
    const params = new URLSearchParams("gateway=paystack&junk=1&search=%20&status=failed");
    expect(parseFilters(params, ["gateway", "search", "status"] as const)).toEqual({
      gateway: "paystack",
      status: "failed",
    });
  });
});

describe("toSearch", () => {
  it("omits empty values", () => {
    expect(toSearch({ a: "1", b: undefined, c: "" })).toBe("?a=1");
    expect(toSearch({})).toBe("");
  });
});

describe("countFilters", () => {
  it("does not count the sort", () => {
    expect(countFilters({ search: "x", sort: "name", gateway: undefined }, ["sort"])).toBe(1);
  });
});

describe("dates", () => {
  it("turns a day into an inclusive start and an exclusive end", () => {
    expect(dayStartIso("2026-10-30")).toBe("2026-10-30T00:00:00.000Z");
    expect(dayEndIso("2026-10-30")).toBe("2026-10-31T00:00:00.000Z");
    expect(dayStartIso("nope")).toBeUndefined();
  });
  it("formats a duration, null while running", () => {
    expect(formatDuration("2026-10-30T09:00:00Z", "2026-10-30T09:03:12Z")).toBe("3m 12s");
    expect(formatDuration("2026-10-30T09:00:00Z", null)).toBeNull();
  });
});
