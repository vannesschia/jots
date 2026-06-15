// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/today",
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.searchParams,
}));

import {
  AppNavbar,
  getSafeActivityReturnTo,
} from "@/components/app-navbar";

const navbarProps = {
  avatarUrl: null,
  displayName: "Ada Lovelace",
};

beforeEach(() => {
  navigation.pathname = "/today";
  navigation.replace.mockReset();
  navigation.searchParams = new URLSearchParams();
});

afterEach(() => {
  cleanup();
});

describe("AppNavbar", () => {
  it("shows the swirl on Today and preserves the selected date for Activity", () => {
    navigation.searchParams = new URLSearchParams({ date: "2026-06-12" });

    render(<AppNavbar {...navbarProps} />);

    expect(screen.getByRole("link", { name: "Go to today" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Open activity" }).getAttribute("href"),
    ).toBe("/activity?returnTo=%2Ftoday%3Fdate%3D2026-06-12");
  });

  it("shows the swirl and active avatar on Profile", () => {
    navigation.pathname = "/profile";

    render(<AppNavbar {...navbarProps} />);

    expect(screen.getByRole("link", { name: "Go to today" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open profile" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Open activity" }).getAttribute("href"),
    ).toBe("/activity?returnTo=%2Fprofile");
  });

  it("shows a back chevron on Activity and replaces to the tracked origin", () => {
    navigation.pathname = "/activity";
    navigation.searchParams = new URLSearchParams({ returnTo: "/profile" });

    render(<AppNavbar {...navbarProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.queryByRole("link", { name: "Go to today" })).toBeNull();
    expect(navigation.replace).toHaveBeenCalledWith("/profile");
    expect(
      screen
        .getByRole("link", { name: "Open activity" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("falls back to Today for missing or unsafe return destinations", () => {
    expect(getSafeActivityReturnTo(null)).toBe("/today");
    expect(getSafeActivityReturnTo("not-a-path")).toBe("/today");
    expect(getSafeActivityReturnTo("//example.com/profile")).toBe("/today");
    expect(getSafeActivityReturnTo("/journal")).toBe("/today");
    expect(getSafeActivityReturnTo("/profile?tab=account")).toBe(
      "/profile?tab=account",
    );

    navigation.pathname = "/activity";
    navigation.searchParams = new URLSearchParams({
      returnTo: "https://example.com/profile",
    });

    render(<AppNavbar {...navbarProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(navigation.replace).toHaveBeenCalledWith("/today");
  });

  it("renders initials without an avatar and the image when provided", () => {
    const view = render(<AppNavbar {...navbarProps} />);

    expect(
      screen.getByRole("link", { name: "Open profile" }).textContent,
    ).toContain("AL");

    view.rerender(
      <AppNavbar
        avatarUrl="https://example.supabase.co/avatar.webp"
        displayName="Ada Lovelace"
      />,
    );

    const image = view.container.querySelector("img");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toBe(
      "https://example.supabase.co/avatar.webp",
    );
  });
});
