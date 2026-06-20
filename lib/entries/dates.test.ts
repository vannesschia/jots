import { afterEach, describe, expect, it, vi } from "vitest";

import { getTodayInTimezone, isValidLocalDate } from "@/lib/entries/dates";

afterEach(() => {
  vi.useRealTimers();
});

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

  it("formats today in the requested timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T03:30:00.000Z"));

    expect(getTodayInTimezone("America/New_York")).toBe("2026-06-15");
    expect(getTodayInTimezone("UTC")).toBe("2026-06-16");
  });
});
