import { describe, expect, it } from "vitest";

import { getAuthRedirect, isProtectedRoute } from "@/lib/auth/route-access";

describe("route access", () => {
  it("redirects the root based on authentication", () => {
    expect(getAuthRedirect("/", false)).toBe("/login");
    expect(getAuthRedirect("/", true)).toBe("/today");
  });

  it("redirects unauthenticated protected routes", () => {
    expect(getAuthRedirect("/today", false)).toBe("/login");
    expect(getAuthRedirect("/activity", false)).toBe("/login");
    expect(getAuthRedirect("/journal/2026", false)).toBe("/login");
    expect(getAuthRedirect("/profile", false)).toBe("/login");
    expect(getAuthRedirect("/onboarding", false)).toBe("/login");
  });

  it("redirects authenticated users away from auth forms", () => {
    expect(getAuthRedirect("/login", true)).toBe("/today");
    expect(getAuthRedirect("/signup", true)).toBe("/today");
  });

  it("redirects unauthenticated signup traffic to the canonical login page", () => {
    expect(getAuthRedirect("/signup", false)).toBe("/login");
  });

  it("allows the callback and canonical login page", () => {
    expect(getAuthRedirect("/auth/callback", false)).toBeNull();
    expect(getAuthRedirect("/login", false)).toBeNull();
  });

  it("matches only complete protected route segments", () => {
    expect(isProtectedRoute("/today")).toBe(true);
    expect(isProtectedRoute("/today/archive")).toBe(true);
    expect(isProtectedRoute("/todayish")).toBe(false);
  });
});
