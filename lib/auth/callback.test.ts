import { describe, expect, it } from "vitest";

import { parseAuthCallback } from "@/lib/auth/callback";

describe("parseAuthCallback", () => {
  it("accepts a PKCE authorization code", () => {
    expect(
      parseAuthCallback(new URL("https://jots.test/auth/callback?code=abc")),
    ).toEqual({ kind: "code", code: "abc" });
  });

  it("rejects missing and non-OAuth callback parameters", () => {
    expect(
      parseAuthCallback(new URL("https://jots.test/auth/callback")),
    ).toEqual({ kind: "invalid" });
    expect(
      parseAuthCallback(
        new URL(
          "https://jots.test/auth/callback?token_hash=abc&type=signup",
        ),
      ),
    ).toEqual({ kind: "invalid" });
  });
});
