"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  CircleUserRound,
  Settings,
  Users,
  Notebook,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/components/logout-button";
import { UserAvatar } from "@/components/user-avatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { getValidUrlDate } from "@/lib/entries/dates";

type AppNavbarProps = {
  avatarUrl: string | null;
  displayName: string;
  username: string;
};

type SearchParamsLike = {
  get: (name: string) => string | null;
  toString: () => string;
};

const DEFAULT_RETURN_TO = "/jots";
const ACTIVITY_RETURN_PATHS = new Set([
  "/jots",
  "/friends",
  "/profile",
  "/settings",
  "/entries",
]);

const DRAWER_LINKS = [
  { href: "/jots", label: "Jots", icon: CalendarDays },
  { href: "/entries", label: "Entries", icon: Notebook },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const WIDE_NAV_LINKS = [
  ...DRAWER_LINKS,
  { href: "/activity", label: "Activity", icon: Bell },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
] as const;

const NAVBAR_TITLES = [
  ...DRAWER_LINKS.map(({ href, label }) => ({ href, label })),
  { href: "/activity", label: "Activity" },
  { href: "/profile", label: "Profile" },
] as const;

export function getNavbarTitle(pathname: string) {
  const title = NAVBAR_TITLES.find(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );

  return title?.label ?? "Jots";
}

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

function getActivityReturnTo(pathname: string, searchParams: SearchParamsLike) {
  const serializedSearchParams = searchParams.toString();

  return pathname === "/activity"
    ? getSafeActivityReturnTo(searchParams.get("returnTo"))
    : getSafeActivityReturnTo(
        `${pathname}${serializedSearchParams ? `?${serializedSearchParams}` : ""}`,
      );
}

function getActivityHref(pathname: string, searchParams: SearchParamsLike) {
  const activityReturnTo = getActivityReturnTo(pathname, searchParams);

  return `/activity?${new URLSearchParams({
    returnTo: activityReturnTo,
  }).toString()}`;
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
  const navbarTitle = getNavbarTitle(pathname);
  const activityReturnTo = getActivityReturnTo(pathname, searchParams);
  const activityHref = getActivityHref(pathname, searchParams);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
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
              aria-label="Go to jots"
              className="flex size-8 items-center justify-center rounded-lg"
              href="/jots"
            >
              <span
                aria-hidden="true"
                className="size-7 bg-foreground [mask:url('/pen-swirl.svg')_center/contain_no-repeat] [-webkit-mask:url('/pen-swirl.svg')_center/contain_no-repeat]"
              />
            </Link>
          )}
          <span className="truncate font-semibold text-xl tracking-tight">
            {navbarTitle}
          </span>
        </div>

        <nav aria-label="Primary" className="flex items-center gap-1">
          <Link
            aria-current={isActivity ? "page" : undefined}
            aria-label="Open activity"
            className="flex size-10 items-center justify-center rounded-lg"
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
                className="mx-1 flex size-8 items-center justify-center rounded-full hover:bg-muted"
                type="button"
              >
                <UserAvatar
                  avatarUrl={avatarUrl}
                  className="size-8"
                  displayName={displayName}
                  fallbackClassName="bg-muted text-foreground"
                />
              </button>
            </DrawerTrigger>
            <DrawerContent className="after:hidden border-2 border-border data-[vaul-drawer-direction=bottom]:inset-x-2 data-[vaul-drawer-direction=bottom]:bottom-2 data-[vaul-drawer-direction=bottom]:rounded-xl">
              <div className="mx-auto w-full">
                <DrawerHeader className="items-start p-1 text-left">
                  <Link
                    aria-current={pathname === "/profile" ? "page" : undefined}
                    aria-label={`Open profile for ${displayName} (@${username})`}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-4 py-3",
                      pathname === "/profile" && "bg-muted",
                    )}
                    href="/profile"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      className="size-10"
                      displayName={displayName}
                      fallbackClassName="bg-muted text-foreground"
                      size="lg"
                    />
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

export function WideAppNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activityHref = getActivityHref(pathname, searchParams);
  const writeDate = getValidUrlDate(searchParams.get("date"));
  const writeHref = writeDate ? `/write/${writeDate}` : "/write"; 

  return (
    <aside className="hidden min-h-0 border-r bg-background lg:flex lg:flex-col">
      <div className="flex h-full min-h-0 w-48 flex-col px-3 py-4">
        <Link
          aria-label="Go to jots"
          className="mb-5 flex size-10 items-center justify-center rounded-lg"
          href="/jots"
        >
          <span
            aria-hidden="true"
            className="size-8 bg-foreground [mask:url('/pen-swirl.svg')_center/contain_no-repeat] [-webkit-mask:url('/pen-swirl.svg')_center/contain_no-repeat]"
          />
        </Link>

        <nav aria-label="Wide app navigation" className="grid gap-1">
          {WIDE_NAV_LINKS.map(({ href, icon: Icon, label }) => {
            const isCurrent =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCurrent && "text-foreground",
                )}
                href={href === "/activity" ? activityHref : href}
                key={href}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-3">
          <Button
            asChild
            aria-label="Create or edit journal entry"
            className="flex h-10 w-full items-center rounded-lg px-3 font-medium"
          >
            <Link href={writeHref}>Create</Link>
          </Button>
        </div>

        <div className="mt-auto pt-3">
          <LogoutButton
            className="flex h-10 w-full justify-start gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            containerClassName="w-full items-stretch"
          />
        </div>
      </div>
    </aside>
  );
}
