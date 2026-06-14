import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { requireProfile } from "@/lib/profile/dal";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();

  return (
    <div className="grid h-svh grid-rows-[minmax(0,1fr)] bg-surface-muted">
      {/* <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link className="font-serif text-xl font-bold text-brand" href="/today">
              Jots
            </Link>
            <nav aria-label="Primary" className="flex items-center gap-1">
              <Link
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                href="/today"
              >
                Today
              </Link>
              <Link
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                href="/journal"
              >
                Journal
              </Link>
              <Link
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
                href="/settings"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:block">
              {profile.display_name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header> */}
      <main className="mx-auto h-full min-h-0 w-full max-w-5xl overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
