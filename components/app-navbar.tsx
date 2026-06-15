"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Settings,
  Users,
  Notebook,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/components/logout-button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { getInitials } from "@/lib/onboarding/validation";
import { cn } from "@/lib/utils";

type AppNavbarProps = {
  avatarUrl: string | null;
  displayName: string;
  username: string;
};

const DEFAULT_RETURN_TO = "/today";
const ACTIVITY_RETURN_PATHS = new Set([
  "/today",
  "/friends",
  "/profile",
  "/settings",
  "/entries",
]);

const DRAWER_LINKS = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/entries", label: "Entries", icon: Notebook },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function getSafeActivityReturnTo(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const url = new URL(value, "https://jots.local");

    if (
      url.origin !== "https://jots.local" ||
      !ACTIVITY_RETURN_PATHS.has(url.pathname)
    ) {
      return DEFAULT_RETURN_TO;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

export function AppNavbar({
  avatarUrl,
  displayName,
  username,
}: AppNavbarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActivity = pathname === "/activity";
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
          <Drawer
            direction="bottom"
            onOpenChange={setAccountMenuOpen}
            open={accountMenuOpen}
          >
            <DrawerTrigger asChild>
              <button
                aria-label="Open account menu"
                className="mx-1 flex size-8 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium hover:bg-muted"
                type="button"
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
              </button>
            </DrawerTrigger>
            <DrawerContent className="after:hidden border-2 border-border data-[vaul-drawer-direction=bottom]:inset-x-2 data-[vaul-drawer-direction=bottom]:bottom-2 data-[vaul-drawer-direction=bottom]:rounded-xl">
              <div className="mx-auto w-full">
                <DrawerHeader className="items-start p-1 text-left">
                  <Link
                    aria-current={pathname === "/profile" ? "page" : undefined}
                    aria-label={`Open profile for ${displayName} (@${username})`}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-4 py-3 hover:bg-muted",
                      pathname === "/profile" && "bg-muted",
                    )}
                    href="/profile"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium">
                      {avatarUrl ? (
                        <Image
                          alt=""
                          className="size-full object-cover"
                          height={40}
                          src={avatarUrl}
                          unoptimized
                          width={40}
                        />
                      ) : (
                        getInitials(displayName)
                      )}
                    </span>
                    <span className="min-w-0 text-left">
                      <DrawerTitle>{displayName}</DrawerTitle>
                      <DrawerDescription>@{username}</DrawerDescription>
                    </span>
                  </Link>
                </DrawerHeader>
                <nav
                  aria-label="Account navigation"
                  className="mx-1 grid gap-1 pb-1"
                >
                  {DRAWER_LINKS.map(({ href, icon: Icon, label }) => {
                    const isCurrent = pathname === href;

                    return (
                      <Link
                        aria-current={isCurrent ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 hover:bg-muted rounded-lg",
                          isCurrent && "bg-muted",
                        )}
                        href={href}
                        key={href}
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        <Icon className="size-4 mr-1" />
                        {label}
                      </Link>
                    );
                  })}
                </nav>
                <DrawerFooter className="items-end border-t py-2.5">
                  <LogoutButton />
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </nav>
      </div>
    </header>
  );
}
