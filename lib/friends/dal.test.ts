import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  getCurrentFriends,
  getIncomingFriendRequests,
  searchUsers,
} from "@/lib/friends/dal";

const CURRENT_USER_ID = "11111111-1111-4111-8111-111111111111";
const ADA_ID = "22222222-2222-4222-8222-222222222222";
const GRACE_ID = "33333333-3333-4333-8333-333333333333";
const ALAN_ID = "44444444-4444-4444-8444-444444444444";
const KATHERINE_ID = "55555555-5555-4555-8555-555555555555";

function profile(id: string, displayName: string, username: string) {
  return {
    avatar_url: null,
    display_name: displayName,
    id,
    username,
  };
}

class QueryBuilder {
  constructor(
    private readonly result: {
      data: unknown;
      error: { message: string } | null;
    },
  ) {}

  eq() {
    return this;
  }

  ilike() {
    return this;
  }

  limit() {
    return this;
  }

  neq() {
    return this;
  }

  or() {
    return this;
  }

  order() {
    return this;
  }

  select() {
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((
          value: { data: unknown; error: { message: string } | null },
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function createSupabase(responses: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const tableResponses = responses[table] ?? [];
      const data = tableResponses.shift() ?? [];

      return new QueryBuilder({
        data,
        error: null,
      });
    },
  };
}

beforeEach(() => {
  mocks.requireUser.mockResolvedValue({ id: CURRENT_USER_ID });
  mocks.createClient.mockReset();
});

describe("friends DAL", () => {
  it("maps friendships where the current user is user_low_id", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({
        friendships: [
          [
            {
              created_at: "2026-06-16T12:00:00Z",
              user_high: profile(ADA_ID, "Ada Lovelace", "ada"),
              user_high_id: ADA_ID,
              user_low: profile(CURRENT_USER_ID, "Current User", "current"),
              user_low_id: CURRENT_USER_ID,
            },
          ],
        ],
      }),
    );

    await expect(getCurrentFriends()).resolves.toEqual([
      profile(ADA_ID, "Ada Lovelace", "ada"),
    ]);
  });

  it("maps friendships where the current user is user_high_id", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({
        friendships: [
          [
            {
              created_at: "2026-06-16T12:00:00Z",
              user_high: profile(CURRENT_USER_ID, "Current User", "current"),
              user_high_id: CURRENT_USER_ID,
              user_low: profile(GRACE_ID, "Grace Hopper", "grace"),
              user_low_id: GRACE_ID,
            },
          ],
        ],
      }),
    );

    await expect(getCurrentFriends()).resolves.toEqual([
      profile(GRACE_ID, "Grace Hopper", "grace"),
    ]);
  });

  it("maps incoming pending friend requests to requester profiles", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({
        friend_requests: [
          [
            {
              created_at: "2026-06-16T12:00:00Z",
              id: "request-1",
              requester: profile(ADA_ID, "Ada Lovelace", "ada"),
            },
          ],
        ],
      }),
    );

    await expect(getIncomingFriendRequests()).resolves.toEqual([
      {
        created_at: "2026-06-16T12:00:00Z",
        id: "request-1",
        requester: profile(ADA_ID, "Ada Lovelace", "ada"),
      },
    ]);
  });

  it("annotates user search results with relationship statuses", async () => {
    mocks.createClient.mockResolvedValue(
      createSupabase({
        friend_requests: [
          [
            {
              receiver_id: CURRENT_USER_ID,
              requester_id: GRACE_ID,
            },
            {
              receiver_id: KATHERINE_ID,
              requester_id: CURRENT_USER_ID,
            },
          ],
        ],
        friendships: [
          [
            {
              user_high_id: ADA_ID,
              user_low_id: CURRENT_USER_ID,
            },
          ],
        ],
        profiles: [
          [
            profile(ADA_ID, "Ada Lovelace", "ada"),
            profile(GRACE_ID, "Grace Hopper", "grace"),
            profile(ALAN_ID, "Alan Turing", "alan"),
          ],
          [
            profile(KATHERINE_ID, "Katherine Johnson", "katherine"),
            profile(ALAN_ID, "Alan Turing", "alan"),
          ],
        ],
      }),
    );

    await expect(searchUsers("a")).resolves.toEqual([
      {
        ...profile(ADA_ID, "Ada Lovelace", "ada"),
        relationshipStatus: "friend",
      },
      {
        ...profile(GRACE_ID, "Grace Hopper", "grace"),
        relationshipStatus: "incoming_request",
      },
      {
        ...profile(ALAN_ID, "Alan Turing", "alan"),
        relationshipStatus: "none",
      },
      {
        ...profile(KATHERINE_ID, "Katherine Johnson", "katherine"),
        relationshipStatus: "outgoing_request",
      },
    ]);
  });
});
