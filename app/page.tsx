import { redirect } from "next/navigation";

import { getProfileByUserId } from "@/lib/profile/dal";
import { getAuthenticatedDestination } from "@/lib/profile/routing";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByUserId(user.id);
  redirect(getAuthenticatedDestination(Boolean(profile)));
}
