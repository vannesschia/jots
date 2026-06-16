export type FriendProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type IncomingFriendRequest = {
  id: string;
  created_at: string;
  requester: FriendProfile;
};

export type RelationshipStatus =
  | "none"
  | "friend"
  | "incoming_request"
  | "outgoing_request";

export type UserSearchResult = FriendProfile & {
  relationshipStatus: RelationshipStatus;
};

export type SearchFriendsActionState = {
  error?: string;
  query?: string;
  results?: UserSearchResult[];
};

export type FriendRequestActionState = {
  error?: string;
  message?: string;
  requestedUserId?: string;
};

export type FriendRequestResponseActionState = {
  error?: string;
  message?: string;
  requestId?: string;
};