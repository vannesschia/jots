import { describe, expect, it } from "vitest";

import { getAuthRedirect, isProtectedRoute } from "@/lib/auth/route-access";

describe("route access", () => {
  it("redirects the root based on authentication", () => {
    expect(getAuthRedirect("/", false)).toBe("/login");
    expect(getAuthRedirect("/", true)).toBe("/jots");
  });

  it("redirects unauthenticated protected routes", () => {
    expect(getAuthRedirect("/jots", false)).toBe("/login");
    expect(getAuthRedirect("/activity", false)).toBe("/login");
    expect(getAuthRedirect("/friends", false)).toBe("/login");
    expect(getAuthRedirect("/profile", false)).toBe("/login");
    expect(getAuthRedirect("/settings", false)).toBe("/login");
    expect(getAuthRedirect("/onboarding", false)).toBe("/login");
    expect(getAuthRedirect("/write", false)).toBe("/login");
    expect(getAuthRedirect("/write/2026-06-15", false)).toBe("/login");
  });

  it("redirects authenticated users away from auth forms", () => {
    expect(getAuthRedirect("/login", true)).toBe("/jots");
    expect(getAuthRedirect("/signup", true)).toBe("/jots");
  });

  it("redirects unauthenticated signup traffic to the canonical login page", () => {
    expect(getAuthRedirect("/signup", false)).toBe("/login");
  });

  it("allows the callback and canonical login page", () => {
    expect(getAuthRedirect("/auth/callback", false)).toBeNull();
    expect(getAuthRedirect("/login", false)).toBeNull();
  });

  it("matches only complete protected route segments", () => {
    expect(isProtectedRoute("/jots")).toBe(true);
    expect(isProtectedRoute("/jots/archive")).toBe(true);
    expect(isProtectedRoute("/jotsish")).toBe(false);
  });
});
