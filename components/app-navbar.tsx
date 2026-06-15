"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getInitials } from "@/lib/onboarding/validation";

type AppNavbarProps = {
  avatarUrl: string | null;
  displayName: string;
};

const DEFAULT_RETURN_TO = "/today";

export function getSafeActivityReturnTo(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const url = new URL(value, "https://jots.local");

    if (
      url.origin !== "https://jots.local" ||
      (url.pathname !== "/today" && url.pathname !== "/profile")
    ) {
      return DEFAULT_RETURN_TO;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

export function AppNavbar({ avatarUrl, displayName }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActivity = pathname === "/activity";
  const isProfile = pathname === "/profile";
  const activityReturnTo = isActivity
    ? getSafeActivityReturnTo(searchParams.get("returnTo"))
    : getSafeActivityReturnTo(
        `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
      );
  const activityHref = `/activity?${new URLSearchParams({
    returnTo: activityReturnTo,
  }).toString()}`;

  return (
    <header className="border-b bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {isActivity ? (
          <button
            aria-label="Back"
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
            onClick={() => router.replace(activityReturnTo)}
            type="button"
          >
            <ChevronLeft className="size-6" />
          </button>
        ) : (
          <Link
            aria-label="Go to today"
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
            href="/today"
          >
            <span
              aria-hidden="true"
              className="size-7 bg-foreground [mask:url('/pen-swirl.svg')_center/contain_no-repeat] [-webkit-mask:url('/pen-swirl.svg')_center/contain_no-repeat]"
            />
          </Link>
        )}

        <nav aria-label="Primary" className="flex items-center gap-1">
          <Link
            aria-current={isActivity ? "page" : undefined}
            aria-label="Open activity"
            className="flex size-10 items-center justify-center rounded-lg hover:bg-muted"
            href={activityHref}
          >
            <Bell className="size-6" />
          </Link>
          <Link
            aria-current={isProfile ? "page" : undefined}
            aria-label="Open profile"
            className="mx-1 flex size-8 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium hover:bg-muted"
            href="/profile"
          >
            {avatarUrl ? (
              <Image
                alt=""
                className="size-full object-cover"
                height={32}
                src={avatarUrl}
                unoptimized
                width={32}
              />
            ) : (
              getInitials(displayName)
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
