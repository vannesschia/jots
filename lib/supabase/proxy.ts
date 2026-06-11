import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getAuthRedirect } from "@/lib/auth/route-access";
import { getSupabaseEnv } from "@/lib/supabase/env";

function setPrivateHeaders(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");

  return response;
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims.sub);
  const destination = getAuthRedirect(
    request.nextUrl.pathname,
    isAuthenticated,
  );

  if (destination) {
    const redirectResponse = NextResponse.redirect(
      new URL(destination, request.url),
    );
    copyCookies(response, redirectResponse);
    return setPrivateHeaders(redirectResponse);
  }

  return setPrivateHeaders(response);
}
