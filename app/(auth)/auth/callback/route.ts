import { NextResponse } from "next/server";

import { parseAuthCallback } from "@/lib/auth/callback";
import { getProfileByUserId } from "@/lib/profile/dal";
import { getAuthenticatedDestination } from "@/lib/profile/routing";
import { createClient } from "@/lib/supabase/server";

function redirectWithNoStore(request: Request, pathname: string) {
  const response = NextResponse.redirect(new URL(pathname, request.url));
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  return response;
}

export async function GET(request: Request) {
  const callback = parseAuthCallback(new URL(request.url));

  if (callback.kind === "code") {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      callback.code,
    );

    if (error || !data.user) {
      return redirectWithNoStore(request, "/login?error=callback");
    }

    const profile = await getProfileByUserId(data.user.id);
    return redirectWithNoStore(
      request,
      getAuthenticatedDestination(Boolean(profile)),
    );
  }

  return redirectWithNoStore(request, "/login?error=callback");
}
