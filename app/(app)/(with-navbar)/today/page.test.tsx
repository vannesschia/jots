// @vitest-environment jsdom

import type { PropsWithChildren } from "react";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  date: null as string | null,
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () =>
    new URLSearchParams(navigation.date ? { date: navigation.date } : {}),
}));

vi.mock("@/lib/entries/dates", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/entries/dates")>();

  return {
    ...actual,
    getTodayLocalDate: () => "2026-06-12",
  };
});

vi.mock("@base-ui/react", async () => {
  const React = await import("react");
  const PopoverContext = React.createContext<{
    onOpenChange: (open: boolean) => void;
    open: boolean;
  } | null>(null);

  function usePopoverContext() {
    const context = React.useContext(PopoverContext);

    if (!context) {
      throw new Error("Popover parts must be rendered inside Popover.Root.");
    }

    return context;
  }

  return {
    Popover: {
      Root({
        children,
        onOpenChange,
        open,
      }: PropsWithChildren<{
        onOpenChange: (open: boolean) => void;
        open: boolean;
      }>) {
        return (
          <PopoverContext.Provider value={{ onOpenChange, open }}>
            {children}
          </PopoverContext.Provider>
        );
      },
      Trigger({
        children,
        render,
        ...props
      }: PropsWithChildren<{
        "aria-label"?: string;
        render?: React.ReactNode;
      }>) {
        const { onOpenChange, open } = usePopoverContext();
        void render;

        return (
          <button onClick={() => onOpenChange(!open)} type="button" {...props}>
            {children}
          </button>
        );
      },
      Portal({ children }: PropsWithChildren) {
        return children;
      },
      Positioner({ children }: PropsWithChildren) {
        return children;
      },
      Popup({ children }: PropsWithChildren) {
        const { open } = usePopoverContext();

        return open ? <div role="dialog">{children}</div> : null;
      },
    },
  };
});

vi.mock("@/components/ui/calendar", () => ({
  Calendar({
    onSelect,
  }: {
    onSelect: (date: Date) => void;
  }) {
    return (
      <button onClick={() => onSelect(new Date(2026, 4, 1))} type="button">
        Choose May 1
      </button>
    );
  },
}));

import TodayClient from "@/app/(app)/(with-navbar)/today/today-client";

beforeEach(() => {
  navigation.date = null;
  navigation.push.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TodayClient date navigation", () => {
  it("updates the URL from the rail without moving the calendar anchor", async () => {
    const user = userEvent.setup();
    navigation.date = "2026-05-01";
    const view = render(<TodayClient />);

    await user.click(
      screen.getByRole("button", { name: "Monday, May 4, 2026" }),
    );

    expect(navigation.push).toHaveBeenCalledWith(
      "/today?date=2026-05-04",
      { scroll: false },
    );

    navigation.date = "2026-05-04";
    view.rerender(<TodayClient />);

    expect(
      screen.getByRole("button", { name: "Friday, April 17, 2026" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Friday, May 8, 2026" }),
    ).toBeTruthy();
  });

  it("replaces the recent rail and closes the calendar after selection", async () => {
    const user = userEvent.setup();
    const view = render(<TodayClient />);

    expect(
      screen.getByRole("button", { name: "Saturday, May 30, 2026" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Choose date" }));
    await user.click(screen.getByRole("button", { name: "Choose May 1" }));

    expect(navigation.push).toHaveBeenCalledWith(
      "/today?date=2026-05-01",
      { scroll: false },
    );
    expect(
      screen.queryByRole("button", { name: "Choose May 1" }),
    ).toBeNull();

    navigation.date = "2026-05-01";
    view.rerender(<TodayClient />);

    expect(
      screen.getByRole("button", { name: "Friday, April 17, 2026" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Friday, May 8, 2026" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Saturday, May 9, 2026" }),
    ).toBeNull();
  });
});
