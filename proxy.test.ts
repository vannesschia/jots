import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

function doesProxyMatch(url: string) {
  const source = config.matcher[0];
  const pathname = new URL(url, "https://jots.test").pathname;

  return new RegExp(`^${source}$`).test(pathname);
}

describe("proxy matcher", () => {
  it.each(["/", "/login", "/auth/callback", "/today", "/journal"])(
    "matches application route %s",
    (url) => {
      expect(doesProxyMatch(url)).toBe(true);
    },
  );

  it.each([
    "/_next/static/chunk.js",
    "/_next/image",
    "/favicon.ico",
    "/brand.svg",
    "/photo.png",
  ])("skips static asset %s", (url) => {
    expect(doesProxyMatch(url)).toBe(false);
  });
});
