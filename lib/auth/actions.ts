"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getConfiguredSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

async function getRequestOrigin() {
  if (process.env.NODE_ENV !== "development") {
    const configuredSiteUrl = getConfiguredSiteUrl();

    if (!configuredSiteUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL is required outside development.");
    }

    return configuredSiteUrl;
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    return origin;
  }

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Unable to determine the application URL.");
  }

  return `${protocol}://${host}`;
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  return {
    error: error ? "Unable to sign out. Please try again." : null,
  };
}
