import { describe, expect, it } from "vitest";

import { isValidLocalDate } from "@/lib/entries/dates";

describe("local date validation", () => {
  it("accepts real YYYY-MM-DD calendar dates", () => {
    expect(isValidLocalDate("2026-06-12")).toBe(true);
    expect(isValidLocalDate("2024-02-29")).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isValidLocalDate("2026-6-12")).toBe(false);
    expect(isValidLocalDate("2026-02-29")).toBe(false);
    expect(isValidLocalDate("not-a-date")).toBe(false);
  });
});
