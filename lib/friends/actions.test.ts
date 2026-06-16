import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
} from "@/lib/friends/actions";

const TARGET_USER_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";

function friendRequestFormData(receiverId: string) {
  const data = new FormData();
  data.set("receiverId", receiverId);

  return data;
}

function requestResponseFormData(requestId: string) {
  const data = new FormData();
  data.set("requestId", requestId);

  return data;
}

function createSupabase(status: string, error: { message: string } | null = null) {
  return {
    rpc: vi.fn(async () => ({
      data: status,
      error,
    })),
  };
}

beforeEach(() => {
  mocks.createClient.mockReset();
  mocks.requireUser.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
  });
  mocks.revalidatePath.mockReset();
});

describe("sendFriendRequest", () => {
  it("rejects a missing target before calling Supabase", async () => {
    await expect(sendFriendRequest({}, friendRequestFormData(""))).resolves.toEqual({
      error: "Choose a valid user before sending a friend request.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns a missing user error from the RPC", async () => {
    mocks.createClient.mockResolvedValue(createSupabase("target_not_found"));

    await expect(
      sendFriendRequest({}, friendRequestFormData(TARGET_USER_ID)),
    ).resolves.toEqual({
      error: "We could not find that user.",
      requestedUserId: TARGET_USER_ID,
    });
  });

  it("returns a self-request error from the RPC", async () => {
    mocks.createClient.mockResolvedValue(createSupabase("self_request"));

    await expect(
      sendFriendRequest({}, friendRequestFormData(TARGET_USER_ID)),
    ).resolves.toEqual({
      error: "You cannot send a friend request to yourself.",
      requestedUserId: TARGET_USER_ID,
    });
  });

  it("returns an already-friends error from the RPC", async () => {
    mocks.createClient.mockResolvedValue(createSupabase("already_friends"));

    await expect(
      sendFriendRequest({}, friendRequestFormData(TARGET_USER_ID)),
    ).resolves.toEqual({
      error: "You are already friends with this user.",
      requestedUserId: TARGET_USER_ID,
    });
  });

  it("returns an existing-request error for incoming or outgoing pending requests", async () => {
    mocks.createClient.mockResolvedValue(createSupabase("pending_exists"));

    await expect(
      sendFriendRequest({}, friendRequestFormData(TARGET_USER_ID)),
    ).resolves.toEqual({
      error: "A friend request already exists between you and this user.",
      requestedUserId: TARGET_USER_ID,
    });
  });

  it("revalidates friends after a successful request", async () => {
    const supabase = createSupabase("created");
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      sendFriendRequest({}, friendRequestFormData(TARGET_USER_ID)),
    ).resolves.toEqual({
      message: "Friend request sent.",
      requestedUserId: TARGET_USER_ID,
    });
    expect(supabase.rpc).toHaveBeenCalledWith("create_friend_request", {
      target_user_id: TARGET_USER_ID,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/friends");
  });
});

describe("friend request response actions", () => {
  it("accepts a pending request through the RPC", async () => {
    const supabase = createSupabase("accepted");
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      acceptFriendRequest({}, requestResponseFormData(REQUEST_ID)),
    ).resolves.toEqual({
      message: "Friend request accepted.",
      requestId: REQUEST_ID,
    });
    expect(supabase.rpc).toHaveBeenCalledWith("accept_friend_request", {
      request_id: REQUEST_ID,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/friends");
  });

  it("declines a pending request through the RPC", async () => {
    const supabase = createSupabase("declined");
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      declineFriendRequest({}, requestResponseFormData(REQUEST_ID)),
    ).resolves.toEqual({
      message: "Friend request declined.",
      requestId: REQUEST_ID,
    });
    expect(supabase.rpc).toHaveBeenCalledWith("decline_friend_request", {
      request_id: REQUEST_ID,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/friends");
  });

  it("maps handled requests to a friendly error", async () => {
    mocks.createClient.mockResolvedValue(createSupabase("not_pending"));

    await expect(
      acceptFriendRequest({}, requestResponseFormData(REQUEST_ID)),
    ).resolves.toEqual({
      error: "This friend request has already been handled.",
      requestId: REQUEST_ID,
    });
  });
});
