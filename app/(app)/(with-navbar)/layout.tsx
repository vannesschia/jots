import { AppNavbar } from "@/components/app-navbar";
import { requireProfile } from "@/lib/profile/dal";

export default async function NavbarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <AppNavbar
        avatarUrl={profile.avatar_url}
        displayName={profile.display_name}
      />
      <div className="min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}
