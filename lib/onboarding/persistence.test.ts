import { describe, expect, it, vi } from "vitest";

import {
  persistOnboarding,
  type OnboardingStore,
} from "@/lib/onboarding/persistence";

function createStore(overrides: Partial<OnboardingStore> = {}) {
  const store: OnboardingStore = {
    uploadAvatar: vi.fn(async () => ({
      publicUrl: "https://example.supabase.co/storage/v1/object/public/avatars/avatar.jpg",
    })),
    deleteAvatar: vi.fn(async () => undefined),
    insertProfile: vi.fn(async () => ({})),
    ...overrides,
  };

  return store;
}

const input = {
  userId: "11111111-1111-1111-1111-111111111111",
  username: "valid_user",
  displayName: "Valid User",
  preferredTimezone: "America/New_York",
};

describe("onboarding persistence", () => {
  it("creates a profile without an optional avatar", async () => {
    const store = createStore();
    const result = await persistOnboarding(store, {
      ...input,
      avatar: null,
    });

    expect(result).toEqual({ status: "success" });
    expect(store.uploadAvatar).not.toHaveBeenCalled();
    expect(store.insertProfile).toHaveBeenCalledWith({
      id: input.userId,
      username: input.username,
      display_name: input.displayName,
      avatar_url: null,
      preferred_timezone: input.preferredTimezone,
    });
  });

  it("uploads an avatar before inserting the profile", async () => {
    const store = createStore();
    const avatar = new File(["avatar"], "avatar.png", { type: "image/png" });
    const result = await persistOnboarding(
      store,
      { ...input, avatar },
      () => "fixed-id",
    );

    expect(result).toEqual({ status: "success" });
    expect(store.uploadAvatar).toHaveBeenCalledWith(
      `${input.userId}/fixed-id.png`,
      avatar,
    );
    expect(store.insertProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar_url:
          "https://example.supabase.co/storage/v1/object/public/avatars/avatar.jpg",
      }),
    );
  });

  it("removes an uploaded avatar when the username loses a race", async () => {
    const store = createStore({
      insertProfile: vi.fn(async () => ({
        error: {
          code: "23505",
          message:
            'duplicate key value violates unique constraint "profiles_username_lower_key"',
        },
      })),
    });
    const avatar = new File(["avatar"], "avatar.webp", {
      type: "image/webp",
    });

    const result = await persistOnboarding(
      store,
      { ...input, avatar },
      () => "fixed-id",
    );

    expect(result).toEqual({ status: "username_taken" });
    expect(store.deleteAvatar).toHaveBeenCalledWith(
      `${input.userId}/fixed-id.webp`,
    );
  });

  it("recognizes an already completed profile", async () => {
    const store = createStore({
      insertProfile: vi.fn(async () => ({
        error: {
          code: "23505",
          message:
            'duplicate key value violates unique constraint "profiles_pkey"',
        },
      })),
    });

    const result = await persistOnboarding(store, {
      ...input,
      avatar: null,
    });

    expect(result).toEqual({ status: "profile_exists" });
  });
});
