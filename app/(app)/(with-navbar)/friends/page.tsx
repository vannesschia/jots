import { FriendsClient } from "@/components/friends/friends-client";
import {
  getCurrentFriends,
  getIncomingFriendRequests,
} from "@/lib/friends/dal";

export default async function FriendsPage() {
  const [friends, incomingRequests] = await Promise.all([
    getCurrentFriends(),
    getIncomingFriendRequests(),
  ]);

  return (
    <section className="p-6">
      <section className="mt-2">
        <FriendsClient friends={friends} incomingRequests={incomingRequests} />
      </section>
    </section>
  );
}
