// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/jots",
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.searchParams,
}));

vi.mock("@/components/logout-button", () => ({
  LogoutButton: ({
    className,
    containerClassName,
  }: {
    className?: string;
    containerClassName?: string;
  }) => (
    <div className={containerClassName}>
      <button className={className} type="button">
        Sign out
      </button>
    </div>
  ),
}));

import {
  AppNavbar,
  getNavbarTitle,
  getSafeActivityReturnTo,
  WideAppNavbar,
} from "@/components/app-navbar";

const navbarProps = {
  avatarUrl: null,
  displayName: "Ada Lovelace",
  username: "ada_lovelace",
};

class LoadedImage {
  complete = true;
  crossOrigin: string | null = null;
  naturalWidth = 1;
  referrerPolicy = "";
  src = "";

  addEventListener() {}
  removeEventListener() {}
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
  Object.defineProperty(window, "Image", {
    configurable: true,
    value: LoadedImage,
  });
  navigation.pathname = "/jots";
  navigation.replace.mockReset();
  navigation.searchParams = new URLSearchParams();
});

afterEach(() => {
  cleanup();
});

describe("AppNavbar", () => {
  it("shows the swirl on Jots and preserves the selected date for Activity", () => {
    navigation.searchParams = new URLSearchParams({ date: "2026-06-12" });

    render(<AppNavbar {...navbarProps} />);

    expect(screen.getByRole("link", { name: "Go to jots" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Open activity" }).getAttribute("href"),
    ).toBe("/activity?returnTo=%2Fjots%3Fdate%3D2026-06-12");
  });

  it.each([
    ["/jots", "Jots", "/activity?returnTo=%2Fjots"],
    ["/entries", "Entries", "/activity?returnTo=%2Fentries"],
    ["/friends", "Friends", "/activity?returnTo=%2Ffriends"],
    ["/profile", "Profile", "/activity?returnTo=%2Fprofile"],
    ["/settings", "Settings", "/activity?returnTo=%2Fsettings"],
  ])(
    "opens account navigation and tracks Activity from %s",
    (pathname, currentLabel, expectedActivityHref) => {
      navigation.pathname = pathname;

      render(<AppNavbar {...navbarProps} />);

      expect(screen.getByRole("link", { name: "Go to jots" })).toBeTruthy();
      expect(screen.getByText(currentLabel)).toBeTruthy();
      expect(
        screen
          .getByRole("link", { name: "Open activity" })
          .getAttribute("href"),
      ).toBe(expectedActivityHref);

      fireEvent.click(
        screen.getByRole("button", { name: "Open account menu" }),
      );

      const currentLink =
        pathname === "/profile"
          ? screen.getByRole("link", {
              name: "Open profile for Ada Lovelace (@ada_lovelace)",
            })
          : screen.getByRole("link", { name: currentLabel });

      expect(currentLink.getAttribute("aria-current")).toBe("page");
      expect(
        screen.getByRole("link", { name: "Jots" }),
      ).toBeTruthy();
      expect(
        screen.getByRole("link", { name: "Friends" }),
      ).toBeTruthy();
      expect(
        screen.getByRole("link", {
          name: "Open profile for Ada Lovelace (@ada_lovelace)",
        }),
      ).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Profile" })).toBeNull();
      expect(
        screen.getByRole("link", { name: "Settings" }),
      ).toBeTruthy();
      expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    },
  );

  it.each([
    ["/jots", "Jots"],
    ["/jots/archive", "Jots"],
    ["/entries", "Entries"],
    ["/friends", "Friends"],
    ["/profile", "Profile"],
    ["/settings", "Settings"],
    ["/activity", "Activity"],
    ["/unknown", "Jots"],
  ])("resolves the navbar title for %s", (pathname, expectedTitle) => {
    expect(getNavbarTitle(pathname)).toBe(expectedTitle);
  });

  it("closes account navigation after selecting a destination", () => {
    render(<AppNavbar {...navbarProps} />);
    const trigger = screen.getByRole("button", { name: "Open account menu" });

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const friendsLink = screen.getByRole("link", { name: "Friends" });
    friendsLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(friendsLink);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the profile avatar and identity in the drawer header", async () => {
    render(
      <AppNavbar
        avatarUrl="https://example.supabase.co/avatar.webp"
        displayName="Ada Lovelace"
        username="ada_lovelace"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open account menu" }),
    );

    const profileLink = screen.getByRole("link", {
      name: "Open profile for Ada Lovelace (@ada_lovelace)",
    });
    await waitFor(() => {
      expect(profileLink.querySelector("img")).not.toBeNull();
    });
    const drawerAvatar = profileLink.querySelector("img");

    expect(drawerAvatar?.getAttribute("src")).toBe(
      "https://example.supabase.co/avatar.webp",
    );
    expect(profileLink.className).toContain("w-full");
    expect(screen.getByRole("dialog").className).toContain(
      "data-[vaul-drawer-direction=bottom]:inset-x-2",
    );
    expect(screen.getByRole("dialog").className).toContain(
      "data-[vaul-drawer-direction=bottom]:bottom-2",
    );
    expect(screen.getByRole("dialog").className).toContain(
      "data-[vaul-drawer-direction=bottom]:rounded-xl",
    );
    expect(screen.getByRole("dialog").className).toContain("border-border");
    expect(screen.getByRole("dialog").className).toContain("after:hidden");
  });

  it.each([
    ["/jots?date=2026-06-12", "/jots?date=2026-06-12"],
    ["/friends?tab=requests", "/friends?tab=requests"],
    ["/profile?tab=account", "/profile?tab=account"],
    ["/settings?section=privacy", "/settings?section=privacy"],
  ])(
    "shows a back chevron on Activity and returns to %s",
    (returnTo, expectedDestination) => {
      navigation.pathname = "/activity";
      navigation.searchParams = new URLSearchParams({ returnTo });

      render(<AppNavbar {...navbarProps} />);
      fireEvent.click(screen.getByRole("button", { name: "Back" }));

      expect(screen.queryByRole("link", { name: "Go to jots" })).toBeNull();
      expect(navigation.replace).toHaveBeenCalledWith(expectedDestination);
      expect(
        screen
          .getByRole("link", { name: "Open activity" })
          .getAttribute("aria-current"),
      ).toBe("page");
    },
  );

  it("falls back to Jots for missing or unsafe return destinations", () => {
    expect(getSafeActivityReturnTo(null)).toBe("/jots");
    expect(getSafeActivityReturnTo("not-a-path")).toBe("/jots");
    expect(getSafeActivityReturnTo("//example.com/profile")).toBe("/jots");
    expect(getSafeActivityReturnTo("/journal")).toBe("/jots");
    expect(getSafeActivityReturnTo("/friends?tab=requests")).toBe(
      "/friends?tab=requests",
    );
    expect(getSafeActivityReturnTo("/profile?tab=account")).toBe(
      "/profile?tab=account",
    );
    expect(getSafeActivityReturnTo("/settings?section=privacy")).toBe(
      "/settings?section=privacy",
    );

    navigation.pathname = "/activity";
    navigation.searchParams = new URLSearchParams({
      returnTo: "https://example.com/profile",
    });

    render(<AppNavbar {...navbarProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(navigation.replace).toHaveBeenCalledWith("/jots");
  });

  it("renders initials without an avatar and the image when provided", async () => {
    const view = render(<AppNavbar {...navbarProps} />);

    expect(
      screen.getByRole("button", { name: "Open account menu" }).textContent,
    ).toContain("AL");

    view.rerender(
      <AppNavbar
        avatarUrl="https://example.supabase.co/avatar.webp"
        displayName="Ada Lovelace"
        username="ada_lovelace"
      />,
    );

    await waitFor(() => {
      expect(view.container.querySelector("img")).not.toBeNull();
    });
    const image = view.container.querySelector("img");
    expect(image?.getAttribute("src")).toBe(
      "https://example.supabase.co/avatar.webp",
    );
  });
});

describe("WideAppNavbar", () => {
  it("renders the wide navigation links and final Create action", () => {
    render(<WideAppNavbar />);

    const nav = screen.getByRole("navigation", {
      name: "Wide app navigation",
    });

    expect(nav).toBeTruthy();
    expect(screen.getByRole("link", { name: "Jots" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Entries" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Friends" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Activity" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Profile" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", {
          name: "Create or edit journal entry",
        })
        .getAttribute("href"),
    ).toBe("/write");
    expect(screen.getByRole("button", { name: "Sign out" }).className).toContain(
      "w-full",
    );
  });

  it("preserves Activity return destinations in the wide navigation", () => {
    navigation.searchParams = new URLSearchParams({ date: "2026-06-12" });

    render(<WideAppNavbar />);

    expect(
      screen.getByRole("link", { name: "Activity" }).getAttribute("href"),
    ).toBe("/activity?returnTo=%2Fjots%3Fdate%3D2026-06-12");
  });

  it("marks the matching wide navigation destination as current", () => {
    navigation.pathname = "/profile";

    render(<WideAppNavbar />);

    expect(
      screen.getByRole("link", { name: "Profile" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Jots" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});
