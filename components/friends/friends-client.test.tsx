// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  searchFriends: vi.fn(),
  sendFriendRequest: vi.fn(),
}));

vi.mock("@/lib/friends/actions", () => ({
  acceptFriendRequest: actionMocks.acceptFriendRequest,
  declineFriendRequest: actionMocks.declineFriendRequest,
  searchFriends: actionMocks.searchFriends,
  sendFriendRequest: actionMocks.sendFriendRequest,
}));

import { FriendsClient } from "@/components/friends/friends-client";
import type {
  FriendProfile,
  IncomingFriendRequest,
  UserSearchResult,
} from "@/lib/friends/types";

function profile(
  id: string,
  displayName: string,
  username: string,
): FriendProfile {
  return {
    avatar_url: null,
    display_name: displayName,
    id,
    username,
  };
}

const friends = [profile("friend-1", "Ada Lovelace", "ada")];
const incomingRequests: IncomingFriendRequest[] = [
  {
    created_at: "2026-06-16T12:00:00Z",
    id: "request-1",
    requester: profile("requester-1", "Grace Hopper", "grace"),
  },
];
const searchResults: UserSearchResult[] = [
  {
    ...profile("search-1", "Alan Turing", "alan"),
    relationshipStatus: "none",
  },
  {
    ...profile("search-2", "Katherine Johnson", "katherine"),
    relationshipStatus: "friend",
  },
];

beforeEach(() => {
  actionMocks.searchFriends.mockImplementation(
    async (_state: unknown, formData: FormData) => ({
      query: formData.get("query"),
      results: searchResults,
    }),
  );
  actionMocks.acceptFriendRequest.mockResolvedValue({});
  actionMocks.declineFriendRequest.mockResolvedValue({});
  actionMocks.sendFriendRequest.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FriendsClient", () => {
  it("renders loaded friends in the All tab", () => {
    render(
      <FriendsClient friends={friends} incomingRequests={incomingRequests} />,
    );

    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("@ada")).toBeTruthy();
  });

  it("renders incoming requests in the Requests tab", async () => {
    const user = userEvent.setup();
    render(
      <FriendsClient friends={friends} incomingRequests={incomingRequests} />,
    );

    await user.click(screen.getByRole("tab", { name: "Requests" }));

    expect(screen.getByText("Grace Hopper")).toBeTruthy();
    expect(screen.getByText("@grace")).toBeTruthy();
  });

  it("submits search text and disables non-requestable users", async () => {
    const user = userEvent.setup();
    render(
      <FriendsClient friends={friends} incomingRequests={incomingRequests} />,
    );

    await user.click(screen.getByRole("tab", { name: "Add Friend" }));
    await user.type(
      screen.getByPlaceholderText("Type to search by name or username..."),
      "alan",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(actionMocks.searchFriends).toHaveBeenCalled();
    });
    const submittedFormData = actionMocks.searchFriends.mock.calls[0]?.[1] as
      | FormData
      | undefined;
    expect(submittedFormData?.get("query")).toBe("alan");

    await waitFor(() => {
      expect(screen.getByText("Alan Turing")).toBeTruthy();
    });
    const searchPanel = screen.getByRole("tabpanel", { name: "Add Friend" });
    expect(
      within(searchPanel).getByRole("button", { name: "Add" }),
    ).toBeTruthy();
    expect(
      (
        within(searchPanel).getByRole("button", {
          name: "Friends",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
