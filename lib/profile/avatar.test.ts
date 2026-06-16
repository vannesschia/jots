import { describe, expect, it } from "vitest";

import { getInitials } from "@/lib/profile/avatar";

describe("getInitials", () => {
  it("creates avatar fallback initials", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
    expect(getInitials("Prince")).toBe("P");
    expect(getInitials("")).toBe("?");
  });
});
