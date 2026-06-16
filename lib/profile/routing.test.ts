import { describe, expect, it } from "vitest";

import {
  getAuthenticatedDestination,
  getOnboardingRedirect,
} from "@/lib/profile/routing";

describe("profile routing", () => {
  it("sends incomplete authenticated users to onboarding", () => {
    expect(getAuthenticatedDestination(false)).toBe("/onboarding");
  });

  it("sends completed authenticated users to the app", () => {
    expect(getAuthenticatedDestination(true)).toBe("/jots");
  });

  it("prevents completed users from reentering onboarding", () => {
    expect(getOnboardingRedirect(true)).toBe("/jots");
    expect(getOnboardingRedirect(false)).toBeNull();
  });
});
