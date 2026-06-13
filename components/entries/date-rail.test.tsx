// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DateRail } from "@/components/entries/date-rail";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DateRail", () => {
  it("renders the fixed 14-day recent range ending today", () => {
    render(
      <DateRail
        onSelectDate={vi.fn()}
        rangeAnchorDate="2026-06-12"
        selectedDate="2026-06-12"
        todayDate="2026-06-12"
      />,
    );

    const dates = screen.getAllByRole("button");

    expect(dates).toHaveLength(14);
    expect(dates[0].getAttribute("aria-label")).toBe(
      "Saturday, May 30, 2026",
    );
    expect(dates[13].getAttribute("aria-label")).toBe(
      "Friday, June 12, 2026",
    );
  });

  it("renders 14 days before the calendar anchor and seven days after", () => {
    render(
      <DateRail
        daysAfter={7}
        daysBefore={14}
        onSelectDate={vi.fn()}
        rangeAnchorDate="2026-05-01"
        selectedDate="2026-05-01"
        todayDate="2026-06-12"
      />,
    );

    const dates = screen.getAllByRole("button");

    expect(dates).toHaveLength(22);
    expect(dates[0].getAttribute("aria-label")).toBe("Friday, April 17, 2026");
    expect(dates[21].getAttribute("aria-label")).toBe("Friday, May 8, 2026");
  });

  it("caps a calendar range at today", () => {
    render(
      <DateRail
        daysAfter={7}
        daysBefore={14}
        onSelectDate={vi.fn()}
        rangeAnchorDate="2026-06-10"
        selectedDate="2026-06-10"
        todayDate="2026-06-12"
      />,
    );

    const dates = screen.getAllByRole("button");

    expect(dates).toHaveLength(17);
    expect(dates[0].getAttribute("aria-label")).toBe(
      "Wednesday, May 27, 2026",
    );
    expect(dates[16].getAttribute("aria-label")).toBe(
      "Friday, June 12, 2026",
    );
  });

  it("reports rail selection without changing its rendered range", async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();

    render(
      <DateRail
        daysAfter={7}
        daysBefore={14}
        onSelectDate={onSelectDate}
        rangeAnchorDate="2026-05-01"
        selectedDate="2026-05-01"
        todayDate="2026-06-12"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Monday, May 4, 2026" }),
    );

    expect(onSelectDate).toHaveBeenCalledWith("2026-05-04");
    expect(
      screen.getAllByRole("button")[0].getAttribute("aria-label"),
    ).toBe(
      "Friday, April 17, 2026",
    );
  });
});
