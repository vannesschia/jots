"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  searchFriends,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from "@/lib/friends/actions";
import type {
  FriendRequestResponseActionState,
  FriendProfile,
  IncomingFriendRequest,
  RelationshipStatus,
  UserSearchResult,
} from "@/lib/friends/types";

type FriendsClientProps = {
  friends: FriendProfile[];
  incomingRequests: IncomingFriendRequest[];
};

function ProfileAvatar({ profile }: { profile: FriendProfile }) {
  return (
    <UserAvatar
      avatarUrl={profile.avatar_url}
      className="size-10"
      displayName={profile.display_name}
      fallbackClassName="bg-muted text-foreground"
      size="lg"
    />
  );
}

function ProfileText({ profile }: { profile: FriendProfile }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-medium">{profile.display_name}</span>
      <span className="block truncate text-muted-foreground">
        @{profile.username}
      </span>
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function FriendList({ friends }: { friends: FriendProfile[] }) {
  if (friends.length === 0) {
    return <EmptyState>No friends yet.</EmptyState>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {friends.map((friend) => (
        <li className="flex items-center gap-3 px-4 py-3" key={friend.id}>
          <ProfileAvatar profile={friend} />
          <ProfileText profile={friend} />
        </li>
      ))}
    </ul>
  );
}

function IncomingRequestList({
  requests,
}: {
  requests: IncomingFriendRequest[];
}) {
  const [acceptState, acceptAction] = useActionState(acceptFriendRequest, {});
  const [declineState, declineAction] = useActionState(declineFriendRequest, {});

  if (requests.length === 0) {
    return <EmptyState>No incoming friend requests.</EmptyState>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {requests.map((request) => (
        <IncomingRequestRow
          acceptAction={acceptAction}
          acceptState={acceptState}
          declineAction={declineAction}
          declineState={declineState}
          key={request.id}
          request={request}
        />
      ))}
    </ul>
  );
}

function IncomingRequestRow({
  acceptAction,
  acceptState,
  declineAction,
  declineState,
  request,
}: {
  acceptAction: (formData: FormData) => void;
  acceptState: FriendRequestResponseActionState;
  declineAction: (formData: FormData) => void;
  declineState: FriendRequestResponseActionState;
  request: IncomingFriendRequest;
}) {
  const rowMessage =
    acceptState.requestId === request.id
      ? acceptState.message ?? acceptState.error
      : declineState.requestId === request.id
        ? declineState.message ?? declineState.error
        : null;
  const rowMessageIsError =
    (acceptState.requestId === request.id && Boolean(acceptState.error)) ||
    (declineState.requestId === request.id && Boolean(declineState.error));

  return (
    <li className="flex justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <ProfileAvatar profile={request.requester} />
        <div className="min-w-0">
          <ProfileText profile={request.requester} />
          {rowMessage ? (
            <p
              className={
                rowMessageIsError
                  ? "mt-1 text-xs text-destructive"
                  : "mt-1 text-xs text-muted-foreground"
              }
              role={rowMessageIsError ? "alert" : "status"}
            >
              {rowMessage}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <form action={acceptAction}>
          <input name="requestId" type="hidden" value={request.id} />
          <Button
            aria-label={`Accept friend request from ${request.requester.display_name}`}
            className="rounded-full"
            size="icon"
            type="submit"
            variant="secondary"
          >
            <Check className="size-4" />
          </Button>
        </form>
        <form action={declineAction}>
          <input name="requestId" type="hidden" value={request.id} />
          <Button
            aria-label={`Decline friend request from ${request.requester.display_name}`}
            className="rounded-full"
            size="icon"
            type="submit"
            variant="secondary"
          >
            <X className="size-4" />
          </Button>
        </form>
      </div>
    </li>
  );
}

function getRelationshipLabel(status: RelationshipStatus) {
  switch (status) {
    case "friend":
      return "Friends";
    case "incoming_request":
      return "Requested you";
    case "outgoing_request":
      return "Request sent";
    case "none":
      return "Add";
  }
}

function SearchResultRow({
  action,
  requestError,
  requestMessage,
  requestedUserId,
  result,
}: {
  action: (formData: FormData) => void;
  requestError?: string;
  requestMessage?: string;
  requestedUserId?: string;
  result: UserSearchResult;
}) {
  const requestSent =
    requestedUserId === result.id && Boolean(requestMessage) && !requestError;
  const canRequest = result.relationshipStatus === "none" && !requestSent;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <ProfileAvatar profile={result} />
      <ProfileText profile={result} />
      <form action={action} className="ml-auto">
        <input name="receiverId" type="hidden" value={result.id} />
        <Button disabled={!canRequest} size="sm" type="submit" variant="outline">
          {requestSent ? "Request sent" : getRelationshipLabel(result.relationshipStatus)}
        </Button>
      </form>
    </li>
  );
}

function SearchPanel() {
  const [searchState, searchAction] = useActionState(searchFriends, {
    results: [],
  });
  const [requestState, requestAction] = useActionState(sendFriendRequest, {});
  const results = searchState.results ?? [];

  return (
    <div className="space-y-4">
      <form action={searchAction}>
        <ButtonGroup className="w-full">
          <Input
            defaultValue={searchState.query ?? ""}
            id="friend-search"
            name="query"
            placeholder="Type to search by name or username..."
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </ButtonGroup>
      </form>

      {searchState.error ? (
        <p className="text-sm text-destructive" role="alert">
          {searchState.error}
        </p>
      ) : null}
      {requestState.error ? (
        <p className="text-sm text-destructive" role="alert">
          {requestState.error}
        </p>
      ) : null}
      {requestState.message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {requestState.message}
        </p>
      ) : null}

      {searchState.query && results.length === 0 && !searchState.error ? (
        <EmptyState>No users found.</EmptyState>
      ) : null}
      {results.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {results.map((result) => (
            <SearchResultRow
              action={requestAction}
              key={result.id}
              requestError={requestState.error}
              requestMessage={requestState.message}
              requestedUserId={requestState.requestedUserId}
              result={result}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function FriendsClient({
  friends,
  incomingRequests,
}: FriendsClientProps) {
  return (
    <Tabs className="flex flex-col" defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="requests">Requests</TabsTrigger>
        <TabsTrigger value="search">Add Friend</TabsTrigger>
      </TabsList>
      <TabsContent className="mt-4" value="all">
        <FriendList friends={friends} />
      </TabsContent>
      <TabsContent className="mt-4" value="requests">
        <IncomingRequestList requests={incomingRequests} />
      </TabsContent>
      <TabsContent className="mt-4" value="search">
        <SearchPanel />
      </TabsContent>
    </Tabs>
  );
}
