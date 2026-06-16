import "server-only";

import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import type {
  FriendProfile,
  IncomingFriendRequest,
  RelationshipStatus,
  UserSearchResult,
} from "@/lib/friends/types";

const PROFILE_SELECT = "id, username, display_name, avatar_url";
const SEARCH_LIMIT = 20;

type EmbeddedProfile = FriendProfile | FriendProfile[] | null | undefined;

type FriendshipRow = {
  created_at?: string;
  user_low_id: string;
  user_high_id: string;
  user_low: EmbeddedProfile;
  user_high: EmbeddedProfile;
};

type IncomingRequestRow = {
  id: string;
  created_at: string;
  requester: EmbeddedProfile;
};

type PendingRequestRow = {
  requester_id: string;
  receiver_id: string;
};

function getEmbeddedProfile(value: EmbeddedProfile) {
  return Array.isArray(value) ? value[0] : value;
}

function uniqueProfiles(profiles: FriendProfile[]) {
  const seen = new Set<string>();
  const unique: FriendProfile[] = [];

  for (const profile of profiles) {
    if (!seen.has(profile.id)) {
      seen.add(profile.id);
      unique.push(profile);
    }
  }

  return unique;
}

function getRelationshipStatus({
  currentUserId,
  friendships,
  pendingRequests,
  profileId,
}: {
  currentUserId: string;
  friendships: Pick<FriendshipRow, "user_high_id" | "user_low_id">[];
  pendingRequests: PendingRequestRow[];
  profileId: string;
}): RelationshipStatus {
  const isFriend = friendships.some(
    ({ user_high_id, user_low_id }) =>
      (user_low_id === currentUserId && user_high_id === profileId) ||
      (user_high_id === currentUserId && user_low_id === profileId),
  );

  if (isFriend) {
    return "friend";
  }

  const request = pendingRequests.find(
    ({ receiver_id, requester_id }) =>
      (requester_id === currentUserId && receiver_id === profileId) ||
      (requester_id === profileId && receiver_id === currentUserId),
  );

  if (!request) {
    return "none";
  }

  return request.requester_id === currentUserId
    ? "outgoing_request"
    : "incoming_request";
}

export async function getCurrentFriends(): Promise<FriendProfile[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `created_at, user_low_id, user_high_id, user_low:profiles!friendships_user_low_id_fkey(${PROFILE_SELECT}), user_high:profiles!friendships_user_high_id_fkey(${PROFILE_SELECT})`,
    )
    .or(`user_low_id.eq.${user.id},user_high_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load friends: ${error.message}`);
  }

  return ((data ?? []) as FriendshipRow[])
    .map((friendship) =>
      getEmbeddedProfile(
        friendship.user_low_id === user.id
          ? friendship.user_high
          : friendship.user_low,
      ),
    )
    .filter((profile): profile is FriendProfile => Boolean(profile));
}

export async function getIncomingFriendRequests(): Promise<
  IncomingFriendRequest[]
> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select(
      `id, created_at, requester:profiles!friend_requests_requester_id_fkey(${PROFILE_SELECT})`,
    )
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load friend requests: ${error.message}`);
  }

  return ((data ?? []) as IncomingRequestRow[]).flatMap((request) => {
    const requester = getEmbeddedProfile(request.requester);

    return requester
      ? [
          {
            id: request.id,
            created_at: request.created_at,
            requester,
          },
        ]
      : [];
  });
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const user = await requireUser();
  const supabase = await createClient();
  const pattern = `%${trimmedQuery}%`;
  const usernamePattern = `%${trimmedQuery.toLowerCase()}%`;
  const [displayNameMatches, usernameMatches, friendships, pendingRequests] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .neq("id", user.id)
        .ilike("display_name", pattern)
        .order("display_name", { ascending: true })
        .limit(SEARCH_LIMIT),
      supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .neq("id", user.id)
        .ilike("username", usernamePattern)
        .order("username", { ascending: true })
        .limit(SEARCH_LIMIT),
      supabase
        .from("friendships")
        .select("user_low_id, user_high_id")
        .or(`user_low_id.eq.${user.id},user_high_id.eq.${user.id}`),
      supabase
        .from("friend_requests")
        .select("requester_id, receiver_id")
        .eq("status", "pending")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`),
    ]);

  for (const result of [
    displayNameMatches,
    usernameMatches,
    friendships,
    pendingRequests,
  ]) {
    if (result.error) {
      throw new Error(`Unable to search users: ${result.error.message}`);
    }
  }

  return uniqueProfiles([
    ...((displayNameMatches.data ?? []) as FriendProfile[]),
    ...((usernameMatches.data ?? []) as FriendProfile[]),
  ])
    .slice(0, SEARCH_LIMIT)
    .map((profile) => ({
      ...profile,
      relationshipStatus: getRelationshipStatus({
        currentUserId: user.id,
        friendships: (friendships.data ?? []) as Pick<
          FriendshipRow,
          "user_high_id" | "user_low_id"
        >[],
        pendingRequests: (pendingRequests.data ?? []) as PendingRequestRow[],
        profileId: profile.id,
      }),
    }));
}
