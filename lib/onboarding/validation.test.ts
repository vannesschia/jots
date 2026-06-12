import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIMEZONE,
  getDefaultTimezone,
  getInitials,
  getSuggestedDisplayName,
  getSupportedTimezones,
  getTimezoneGroups,
  getUsernameError,
  normalizeUsername,
  validateOnboardingForm,
} from "@/lib/onboarding/validation";

function createUser(
  userMetadata: Record<string, unknown>,
  email = "fallback@example.com",
) {
  return {
    email,
    user_metadata: userMetadata,
  } as User;
}

function createValidFormData() {
  const formData = new FormData();
  formData.set("username", "valid_user");
  formData.set("displayName", "Valid User");
  formData.set("preferredTimezone", "America/New_York");
  return formData;
}

describe("onboarding validation", () => {
  it("normalizes and validates usernames", () => {
    expect(normalizeUsername("  User_Name ")).toBe("user_name");
    expect(getUsernameError("user_name")).toBeNull();
    expect(getUsernameError("No")).toBeTruthy();
    expect(getUsernameError("invalid-name")).toBeTruthy();
  });

  it("uses Google display metadata with safe fallbacks", () => {
    expect(
      getSuggestedDisplayName(
        createUser({ full_name: "Google Full Name", name: "Google Name" }),
      ),
    ).toBe("Google Full Name");
    expect(getSuggestedDisplayName(createUser({ name: "Google Name" }))).toBe(
      "Google Name",
    );
    expect(getSuggestedDisplayName(createUser({}))).toBe("fallback");
  });

  it("accepts a valid profile without an avatar", () => {
    const result = validateOnboardingForm(createValidFormData());

    expect(result.state).toBeUndefined();
    expect(result.values).toMatchObject({
      username: "valid_user",
      displayName: "Valid User",
      preferredTimezone: "America/New_York",
      avatar: null,
    });
  });

  it("rejects invalid fields and avatar files", () => {
    const formData = createValidFormData();
    formData.set("username", "bad-name");
    formData.set("displayName", "");
    formData.set("preferredTimezone", "Not/A_Timezone");
    formData.set(
      "avatar",
      new File(["plain text"], "avatar.txt", { type: "text/plain" }),
    );

    const result = validateOnboardingForm(formData);

    expect(result.state?.fieldErrors).toMatchObject({
      username: expect.any(String),
      displayName: expect.any(String),
      preferredTimezone: expect.any(String),
      avatar: expect.any(String),
    });
  });

  it("rejects avatars larger than 2 MB", () => {
    const formData = createValidFormData();
    formData.set(
      "avatar",
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "avatar.png", {
        type: "image/png",
      }),
    );

    const result = validateOnboardingForm(formData);

    expect(result.state?.fieldErrors?.avatar).toBe(
      "Avatar must be 2 MB or smaller.",
    );
  });

  it("uses a supported detected timezone and New York otherwise", () => {
    const timezones = ["UTC", "America/New_York"];

    expect(getDefaultTimezone("America/New_York", timezones)).toBe(
      "America/New_York",
    );
    expect(getDefaultTimezone("Invalid/Timezone", timezones)).toBe(
      DEFAULT_TIMEZONE,
    );
    expect(getDefaultTimezone(undefined, timezones)).toBe(DEFAULT_TIMEZONE);
  });

  it("puts New York first without dropping UTC", () => {
    const timezones = getSupportedTimezones();

    expect(timezones[0]).toBe(DEFAULT_TIMEZONE);
    expect(timezones).toContain("UTC");
    expect(new Set(timezones).size).toBe(timezones.length);
  });

  it("groups friendly labels while retaining canonical IANA values", () => {
    const groups = getTimezoneGroups([
      "America/New_York",
      "America/Argentina/Buenos_Aires",
      "Europe/London",
      "UTC",
    ]);
    const americas = groups.find((group) => group.value === "Americas");
    const newYork = americas?.items.find(
      (timezone) => timezone.value === "America/New_York",
    );
    const buenosAires = americas?.items.find(
      (timezone) => timezone.value === "America/Argentina/Buenos_Aires",
    );

    expect(newYork?.label).toBe("New York");
    expect(newYork?.label).not.toContain("GMT");
    expect(newYork?.searchText).toContain("america/new_york");
    expect(buenosAires?.label).toContain("Buenos Aires, Argentina");
    expect(
      groups
        .find((group) => group.value === "Europe")
        ?.items.some((timezone) => timezone.value === "Europe/London"),
    ).toBe(true);
    expect(
      groups
        .find((group) => group.value === "Other")
        ?.items.some((timezone) => timezone.value === "UTC"),
    ).toBe(true);
  });

  it("creates initials for the avatar fallback", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
    expect(getInitials("Prince")).toBe("P");
    expect(getInitials("")).toBe("?");
  });
});
