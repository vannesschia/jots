import { AppNavbar, WideAppNavbar } from "@/components/app-navbar";
import { requireProfile } from "@/lib/profile/dal";

export default async function NavbarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-1">
      <div className="lg:hidden">
        <AppNavbar
          avatarUrl={profile.avatar_url}
          displayName={profile.display_name}
          username={profile.username}
        />
      </div>
      <WideAppNavbar />
      <div className="min-h-0 overflow-y-auto lg:col-start-2 lg:row-start-1">
        {children}
      </div>
    </div>
  );
}
