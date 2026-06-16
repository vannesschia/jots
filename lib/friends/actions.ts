"use server";

import { revalidatePath } from "next/cache";

import { searchUsers } from "@/lib/friends/dal";
import type {
  FriendRequestActionState,
  FriendRequestResponseActionState,
  SearchFriendsActionState,
} from "@/lib/friends/types";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FriendRequestRpcStatus =
  | "created"
  | "unauthenticated"
  | "target_required"
  | "profile_required"
  | "target_not_found"
  | "self_request"
  | "already_friends"
  | "pending_exists";

type FriendRequestResponseRpcStatus =
  | "unauthenticated"
  | "request_required"
  | "not_found"
  | "not_receiver"
  | "not_pending";

type AcceptFriendRequestRpcStatus =
  | "accepted"
  | FriendRequestResponseRpcStatus;

type DeclineFriendRequestRpcStatus =
  | "declined"
  | FriendRequestResponseRpcStatus;

function getReceiverId(formData: FormData) {
  const value = formData.get("receiverId");

  return typeof value === "string" ? value : "";
}

function getRequestId(formData: FormData) {
  const value = formData.get("requestId");

  return typeof value === "string" ? value : "";
}

function getFriendRequestError(status: Exclude<FriendRequestRpcStatus, "created">) {
  switch (status) {
    case "unauthenticated":
      return "Sign in before sending a friend request.";
    case "target_required":
      return "Choose a user before sending a friend request.";
    case "profile_required":
      return "Finish setting up your profile before adding friends.";
    case "target_not_found":
      return "We could not find that user.";
    case "self_request":
      return "You cannot send a friend request to yourself.";
    case "already_friends":
      return "You are already friends with this user.";
    case "pending_exists":
      return "A friend request already exists between you and this user.";
  }
}

function getFriendRequestResponseError(
  status: Exclude<FriendRequestResponseRpcStatus, "accepted" | "declined">,
) {
  switch (status) {
    case "unauthenticated":
      return "Sign in before responding to a friend request.";
    case "request_required":
      return "Choose a friend request before responding.";
    case "not_found":
      return "We could not find that friend request.";
    case "not_receiver":
      return "Only the recipient can respond to this friend request.";
    case "not_pending":
      return "This friend request has already been handled.";
  }
}

export async function searchFriends(
  _state: SearchFriendsActionState,
  formData: FormData,
): Promise<SearchFriendsActionState> {
  const queryValue = formData.get("query");
  const query = typeof queryValue === "string" ? queryValue.trim() : "";

  if (!query) {
    return {
      error: "Type a name or username to search.",
      query,
      results: [],
    };
  }

  try {
    return {
      query,
      results: await searchUsers(query),
    };
  } catch {
    return {
      error: "We could not search users right now. Please try again.",
      query,
      results: [],
    };
  }
}

export async function sendFriendRequest(
  _state: FriendRequestActionState,
  formData: FormData,
): Promise<FriendRequestActionState> {
  const receiverId = getReceiverId(formData);

  if (!UUID_PATTERN.test(receiverId)) {
    return {
      error: "Choose a valid user before sending a friend request.",
    };
  }

  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_friend_request", {
    target_user_id: receiverId,
  });

  if (error) {
    return {
      error: "We could not send that friend request. Please try again.",
      requestedUserId: receiverId,
    };
  }

  const status = data as FriendRequestRpcStatus;

  if (status === "created") {
    revalidatePath("/friends");

    return {
      message: "Friend request sent.",
      requestedUserId: receiverId,
    };
  }

  return {
    error: getFriendRequestError(status),
    requestedUserId: receiverId,
  };
}

export async function acceptFriendRequest(
  _state: FriendRequestResponseActionState,
  formData: FormData,
): Promise<FriendRequestResponseActionState> {
  const requestId = getRequestId(formData);

  if (!UUID_PATTERN.test(requestId)) {
    return {
      error: "Choose a valid friend request before accepting.",
    };
  }

  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_friend_request", {
    request_id: requestId,
  });

  if (error) {
    return {
      error: "We could not accept that friend request. Please try again.",
      requestId,
    };
  }

  const status = data as AcceptFriendRequestRpcStatus;

  if (status === "accepted") {
    revalidatePath("/friends");

    return {
      message: "Friend request accepted.",
      requestId,
    };
  }

  return {
    error: getFriendRequestResponseError(status),
    requestId,
  };
}

export async function declineFriendRequest(
  _state: FriendRequestResponseActionState,
  formData: FormData,
): Promise<FriendRequestResponseActionState> {
  const requestId = getRequestId(formData);

  if (!UUID_PATTERN.test(requestId)) {
    return {
      error: "Choose a valid friend request before declining.",
    };
  }

  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decline_friend_request", {
    request_id: requestId,
  });

  if (error) {
    return {
      error: "We could not decline that friend request. Please try again.",
      requestId,
    };
  }

  const status = data as DeclineFriendRequestRpcStatus;

  if (status === "declined") {
    revalidatePath("/friends");

    return {
      message: "Friend request declined.",
      requestId,
    };
  }

  return {
    error: getFriendRequestResponseError(status),
    requestId,
  };
}
