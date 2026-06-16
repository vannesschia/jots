// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UserAvatar } from "@/components/user-avatar";

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
  Object.defineProperty(window, "Image", {
    configurable: true,
    value: LoadedImage,
  });
});

afterEach(() => {
  cleanup();
});

describe("UserAvatar", () => {
  it("renders initials when no avatar URL is provided", () => {
    render(<UserAvatar displayName="Ada Lovelace" />);

    expect(screen.getByText("AL")).toBeTruthy();
  });

  it("renders an avatar image when a URL is provided", async () => {
    render(
      <UserAvatar
        avatarUrl="https://example.supabase.co/avatar.webp"
        displayName="Ada Lovelace"
        imageAlt="Ada Lovelace avatar"
      />,
    );

    await waitFor(() => {
      expect(screen.getByAltText("Ada Lovelace avatar")).toBeTruthy();
    });
    expect(screen.getByAltText("Ada Lovelace avatar").getAttribute("src")).toBe(
      "https://example.supabase.co/avatar.webp",
    );
  });
});
